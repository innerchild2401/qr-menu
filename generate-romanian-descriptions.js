const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple Romanian description generator
function generateRomanianDescription(productName) {
  const descriptions = {
    'Crispy Cheese CK Burger': 'Delicioasă hamburger cu brânză crocantă, chiftea de vită suculentă și garnituri proaspete.',
    'Double CheeseBurger': 'O hamburger dublu cu brânză suculentă cu două chiftele de vită și brânză topită.',
    'Truffle Burger': 'Savurați o hamburger gourmet acoperit cu aioli bogat de trufe și ciuperci savuroase.',
    'Chicken Curry': 'Curry de pui savuros cu mirodenii aromatice și lapte de cocos cremos.',
    'Spicy Crispy Chicken': 'Pui crocant picant, servit fierbinte și aromat.',
    'Chicken Curry': 'Curry de pui savuros cu mirodenii aromatice și lapte de cocos cremos.',
    'Cadillac Margarita': 'Margarita clasică cu tequila premium, suc de lămâie și triple sec.',
    'Fajitas Chicken': 'Fajitas de pui cu ardei și ceapă, servite cu tortilla caldă.',
    'Havana Cuban Spiced 0.05': 'Rom cubanez condimentat cu arome tropicale și note de vanilie.',
    'Plantation 0.05': 'Rom premium cu note de caramel și vanilie, îmbătrânit în butoaie de stejar.',
    'Long Island Ice Tea': 'Cocktail clasic cu vodka, gin, rom, tequila și triple sec.',
    'Negroni': 'Cocktail italian clasic cu gin, Campari și vermut roșu.',
    'Old Fashioned': 'Cocktail clasic cu bourbon, zahăr și bitter de portocală.',
    'Red Lips Cosmo': 'Cosmopolitan elegant cu vodka, Cointreau și suc de coacăze.',
    'Amaretto Sour': 'Cocktail dulce-acrișor cu Amaretto, suc de lămâie și sirop simplu.',
    'The Classic G&T': 'Gin tonic clasic cu gin premium și tonic premium.',
    'The New Classic G&T': 'Gin tonic modern cu gin premium și tonic artizanal.',
    'Four Roses 0.05': 'Bourbon premium cu note de vanilie și caramel.',
    'Glenlivet 0.05': 'Single malt scotch whisky cu note de fructe și miere.',
    'Powers Gold 0.05': 'Irish whiskey cu note de vanilie și stejar.',
    'The Deacon 0.05': 'Whiskey premium cu arome complexe și finish lung.'
  };
  
  return descriptions[productName] || `Delicioasă ${productName.toLowerCase()}, preparată cu ingrediente proaspete și de calitate.`;
}

async function updateDescriptionsToRomanian() {
  console.log('🇷🇴 Updating descriptions to Romanian...\n');

  try {
    // Get products that have manual_language_override = 'ro' but English descriptions
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, generated_description, manual_language_override')
      .eq('manual_language_override', 'ro')
      .not('generated_description', 'is', null);

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    console.log(`Found ${products.length} products with manual_language_override='ro'`);

    for (const product of products) {
      const romanianDescription = generateRomanianDescription(product.name);
      
      console.log(`Updating ${product.id}: ${product.name}`);
      console.log(`  Old: ${product.generated_description?.substring(0, 50)}...`);
      console.log(`  New: ${romanianDescription.substring(0, 50)}...`);

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          generated_description: romanianDescription,
          ai_last_updated: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Error updating ${product.id}:`, updateError);
      } else {
        console.log(`✅ Updated ${product.id}`);
      }
      console.log('');
    }

    console.log('🎉 Romanian descriptions update completed!');

  } catch (error) {
    console.error('Error:', error);
  }
}

updateDescriptionsToRomanian();
