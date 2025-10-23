import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
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

    // Get product proposals for this restaurant
    const { data: proposals, error: proposalsError } = await supabaseAdmin
      .from('product_proposals')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        has_recipe,
        recipe,
        is_frozen,
        is_vegetarian,
        is_spicy,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        category_id,
        staff_users!inner(
          id,
          name,
          role,
          restaurant_id
        ),
        categories(
          id,
          name
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (proposalsError) {
      console.error('Error fetching product proposals:', proposalsError);
      return NextResponse.json({ error: 'Failed to fetch product proposals' }, { status: 500 });
    }

    // Transform the data
    const transformedProposals = proposals?.map(proposal => {
      const staffUser = Array.isArray(proposal.staff_users) ? proposal.staff_users[0] : proposal.staff_users;
      const category = Array.isArray(proposal.categories) ? proposal.categories[0] : proposal.categories;
      
      return {
        id: proposal.id,
        name: proposal.name,
        description: proposal.description,
        price: proposal.price,
        image_url: proposal.image_url,
        has_recipe: proposal.has_recipe,
        recipe: proposal.recipe,
        is_frozen: proposal.is_frozen,
        is_vegetarian: proposal.is_vegetarian,
        is_spicy: proposal.is_spicy,
        status: proposal.status,
        admin_notes: proposal.admin_notes,
        created_at: proposal.created_at,
        reviewed_at: proposal.reviewed_at,
        category_id: proposal.category_id,
        category_name: category?.name || 'No Category',
        staff_user: {
          id: staffUser?.id || '',
          name: staffUser?.name || 'Unknown Staff',
          role: staffUser?.role || 'Unknown'
        }
      };
    }) || [];

    return NextResponse.json(transformedProposals);

  } catch (error) {
    console.error('Error in product proposals GET:', error);
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

    const { proposal_id, action, admin_notes } = await request.json();

    if (!proposal_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Get the proposal
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('product_proposals')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category_id,
        has_recipe,
        recipe,
        is_frozen,
        is_vegetarian,
        is_spicy,
        status,
        staff_user_id,
        restaurant_id
      `)
      .eq('id', proposal_id)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Product proposal not found' }, { status: 404 });
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: 'Product proposal already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the proposal status
    const { error: updateError } = await supabaseAdmin
      .from('product_proposals')
      .update({
        status: newStatus,
        admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', proposal_id);

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
    }

    // If approved, create the actual product and enhance with AI
    if (action === 'approve') {
      try {
        // First, normalize ingredients and add missing ones to ingredients table
        if (proposal.has_recipe && proposal.recipe) {
          const normalizationResult = await normalizeAndStoreIngredients(proposal.recipe, restaurant.id);
          console.log(`Ingredient normalization: ${normalizationResult.processed} processed, ${normalizationResult.duplicates} duplicates found, ${normalizationResult.new} new ingredients added`);
        }
        
        // Calculate nutritional values
        const nutritionData = proposal.has_recipe && proposal.recipe 
          ? await calculateNutritionalValues(proposal.recipe)
          : null;
        
        // Generate description using GPT-4o mini
        const newDescription = await generateProductDescription(
          proposal.name,
          proposal.recipe || [],
          restaurant.id
        );

        // Create the actual product
        const { data: newProduct, error: productError } = await supabaseAdmin
          .from('products')
          .insert({
            restaurant_id: restaurant.id,
            category_id: proposal.category_id,
            name: proposal.name,
            description: newDescription || proposal.description,
            price: proposal.price,
            image_url: proposal.image_url,
            has_recipe: proposal.has_recipe,
            recipe: proposal.recipe,
            is_frozen: proposal.is_frozen,
            is_vegetarian: proposal.is_vegetarian,
            is_spicy: proposal.is_spicy,
            nutrition: nutritionData,
            available: true,
            created_by: proposal.staff_user_id,
            last_modified_by: proposal.staff_user_id,
            last_modified_at: new Date().toISOString()
          })
          .select()
          .single();

        if (productError) {
          console.error('Error creating product:', productError);
          return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
        }

        // Update the proposal with the created product ID
        await supabaseAdmin
          .from('product_proposals')
          .update({
            admin_notes: `${admin_notes || ''}\n\nProduct created with ID: ${newProduct.id}`.trim()
          })
          .eq('id', proposal_id);

      } catch (aiError) {
        console.error('Error in AI enhancement:', aiError);
        // Still create the product even if AI enhancement fails
        const { data: newProduct, error: productError } = await supabaseAdmin
          .from('products')
          .insert({
            restaurant_id: restaurant.id,
            category_id: proposal.category_id,
            name: proposal.name,
            description: proposal.description,
            price: proposal.price,
            image_url: proposal.image_url,
            has_recipe: proposal.has_recipe,
            recipe: proposal.recipe,
            is_frozen: proposal.is_frozen,
            is_vegetarian: proposal.is_vegetarian,
            is_spicy: proposal.is_spicy,
            available: true,
            created_by: proposal.staff_user_id,
            last_modified_by: proposal.staff_user_id,
            last_modified_at: new Date().toISOString()
          })
          .select()
          .single();

        if (productError) {
          console.error('Error creating product:', productError);
          return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
        }
      }
    }

    // Log the activity
    await supabaseAdmin
      .from('staff_activity_log')
      .insert({
        staff_user_id: proposal.staff_user_id,
        action: action === 'approve' ? 'product_proposal_approved' : 'product_proposal_rejected',
        details: { 
          product_name: proposal.name,
          proposal_id: proposal.id,
          admin_notes
        }
      });

    return NextResponse.json({
      success: true,
      message: `Product proposal ${action}d successfully`
    });

  } catch (error) {
    console.error('Error in product proposals PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions

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
