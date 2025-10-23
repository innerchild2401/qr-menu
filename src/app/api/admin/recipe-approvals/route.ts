import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';
import { normalizeAndStoreIngredients } from '../../../../lib/ingredient-normalization';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending recipe approvals for this restaurant
    const { data: approvals, error: approvalsError } = await supabaseAdmin
      .from('recipe_approvals')
      .select(`
        id,
        product_id,
        proposed_recipe,
        current_recipe,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        staff_users!inner(
          id,
          name,
          role,
          restaurant_id
        ),
        products!inner(
          id,
          name,
          restaurant_id
        )
      `)
      .eq('products.restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (approvalsError) {
      console.error('Error fetching recipe approvals:', approvalsError);
      return NextResponse.json({ error: 'Failed to fetch recipe approvals' }, { status: 500 });
    }

    // Transform the data
    const transformedApprovals = approvals?.map(approval => ({
      id: approval.id,
      product_id: approval.product_id,
      product_name: approval.products?.[0]?.name || 'Unknown Product',
      proposed_recipe: approval.proposed_recipe,
      current_recipe: approval.current_recipe,
      status: approval.status,
      admin_notes: approval.admin_notes,
      created_at: approval.created_at,
      reviewed_at: approval.reviewed_at,
      staff_user: {
        id: approval.staff_users?.[0]?.id || '',
        name: approval.staff_users?.[0]?.name || 'Unknown Staff',
        role: approval.staff_users?.[0]?.role || 'Unknown'
      }
    })) || [];

    return NextResponse.json(transformedApprovals);

  } catch (error) {
    console.error('Error in recipe approvals GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approval_id, action, admin_notes } = await request.json();

    if (!approval_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Get the approval request
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('recipe_approvals')
      .select(`
        id,
        product_id,
        proposed_recipe,
        status,
        staff_user_id,
        products!inner(
          id,
          name,
          restaurant_id
        )
      `)
      .eq('id', approval_id)
      .eq('products.restaurant_id', restaurant.id)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'Approval request already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the approval status
    const { error: updateError } = await supabaseAdmin
      .from('recipe_approvals')
      .update({
        status: newStatus,
        admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', approval_id);

    if (updateError) {
      console.error('Error updating approval:', updateError);
      return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
    }

    // If approved, update the actual product recipe and enhance with AI
    if (action === 'approve') {
      try {
        // First, normalize ingredients and add missing ones to ingredients table
        const normalizationResult = await normalizeAndStoreIngredients(approval.proposed_recipe, restaurant.id);
        console.log(`Ingredient normalization: ${normalizationResult.processed} processed, ${normalizationResult.duplicates} duplicates found, ${normalizationResult.new} new ingredients added`);
        
        // Calculate nutritional values
        const nutritionData = await calculateNutritionalValues(approval.proposed_recipe);
        
        // Generate new description using GPT-4o mini
        const product = Array.isArray(approval.products) ? approval.products[0] : approval.products;
        const newDescription = await generateProductDescription(
          product?.name || 'Product',
          approval.proposed_recipe,
          restaurant.id
        );

        // Update the product with enhanced data
        const { error: productError } = await supabaseAdmin
          .from('products')
          .update({
            recipe: approval.proposed_recipe,
            has_recipe: approval.proposed_recipe && approval.proposed_recipe.length > 0,
            description: newDescription,
            nutrition: nutritionData,
            last_modified_by: approval.staff_user_id, // Use staff user ID instead of admin user ID
            last_modified_at: new Date().toISOString()
          })
          .eq('id', approval.product_id);

        if (productError) {
          console.error('Error updating product recipe:', productError);
          return NextResponse.json({ error: 'Failed to update product recipe' }, { status: 500 });
        }
      } catch (aiError) {
        console.error('Error in AI enhancement:', aiError);
        // Still update the recipe even if AI enhancement fails
        const { error: productError } = await supabaseAdmin
          .from('products')
          .update({
            recipe: approval.proposed_recipe,
            has_recipe: approval.proposed_recipe && approval.proposed_recipe.length > 0,
            last_modified_by: approval.staff_user_id, // Use staff user ID instead of admin user ID
            last_modified_at: new Date().toISOString()
          })
          .eq('id', approval.product_id);

        if (productError) {
          console.error('Error updating product recipe:', productError);
          return NextResponse.json({ error: 'Failed to update product recipe' }, { status: 500 });
        }
      }
    }

    // Log the activity
    await supabaseAdmin
      .from('staff_activity_log')
      .insert({
        staff_user_id: approval.staff_user_id,
        action: action === 'approve' ? 'recipe_approved' : 'recipe_rejected',
        product_id: approval.product_id,
        details: { 
          changes: `Recipe ${action}d by admin`,
          admin_notes,
          approval_id: approval.id
        }
      });

    return NextResponse.json({
      success: true,
      message: `Recipe ${action}d successfully`
    });

  } catch (error) {
    console.error('Error in recipe approvals PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// Helper function to calculate nutritional values
async function calculateNutritionalValues(recipe: Array<{ingredient: string; quantity: number; unit: string}>) {
  if (!recipe || recipe.length === 0) return null;

  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert. Calculate the nutritional values for a recipe based on its ingredients and quantities.

Return ONLY a JSON object with these fields:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number
}

All values should be per serving (not per 100g). Be accurate and realistic.`
          },
          {
            role: 'user',
            content: `Calculate nutritional values for this recipe:\n${JSON.stringify(recipe, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT API Error for nutrition calculation:', await gptResponse.text());
      return null;
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;
    
    if (!content) return null;

    // Parse the JSON response
    const nutritionData = JSON.parse(content);
    return nutritionData;
  } catch (error) {
    console.error('Error calculating nutritional values:', error);
    return null;
  }
}

// Helper function to generate product description
async function generateProductDescription(productName: string, recipe: Array<{ingredient: string; quantity: number; unit: string}>, restaurantId: string) {
  try {
    // Get restaurant context
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('name, cuisine_type')
      .eq('id', restaurantId)
      .single();

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional menu writer for restaurants. Write an appetizing, professional product description in Romanian that highlights the key ingredients and cooking methods.

Guidelines:
- Write in Romanian
- 2-3 sentences maximum
- Focus on taste, texture, and key ingredients
- Use appetizing language
- Mention cooking method if relevant
- Be professional and concise`
          },
          {
            role: 'user',
            content: `Write a description for "${productName}" with this recipe:\n${JSON.stringify(recipe, null, 2)}\n\nRestaurant: ${restaurant?.name || 'Restaurant'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT API Error for description generation:', await gptResponse.text());
      return null;
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;
    
    return content?.trim() || null;
  } catch (error) {
    console.error('Error generating product description:', error);
    return null;
  }
}

// Helper function to normalize ingredients using GPT
async function normalizeIngredientsWithGPT(ingredients: string[]) {
  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an ingredient normalizer for a restaurant management system. Normalize ingredient names to standard forms and provide nutritional estimates.

Return ONLY a JSON array with this structure:
[
  {
    "original_name": "string",
    "normalized_name": "string", 
    "calories_per_100g": number,
    "protein_per_100g": number,
    "carbs_per_100g": number,
    "fat_per_100g": number
  }
]

Guidelines:
- Use proper capitalization and Romanian names
- Remove unnecessary descriptors
- Provide realistic nutritional estimates
- Be consistent with naming conventions`
          },
          {
            role: 'user',
            content: `Normalize these ingredients: ${ingredients.join(', ')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!gptResponse.ok) {
      console.error('GPT API Error for ingredient normalization:', await gptResponse.text());
      return [];
    }

    const gptData = await gptResponse.json();
    const content = gptData.choices[0]?.message?.content;
    
    if (!content) return [];

    const normalizedIngredients = JSON.parse(content);
    return Array.isArray(normalizedIngredients) ? normalizedIngredients : [];
  } catch (error) {
    console.error('Error normalizing ingredients with GPT:', error);
    return [];
  }
}
