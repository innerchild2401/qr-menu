import PromoPopup from '../../../components/PromoPopup';
import Link from 'next/link';

interface MenuPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Define types for our data structures
interface Restaurant {
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo: string;
  cover: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  categoryId: string;
}

interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
}

// Fetch menu data from API
async function getMenuData(slug: string): Promise<MenuData> {
  // Use relative URL for server-side fetching to avoid environment variable issues
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/menu/${slug}`, {
    cache: 'no-store' // Always fetch fresh data
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch menu: ${response.status}`);
  }

  return response.json();
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { slug } = await params;

  try {
    const { restaurant, categories, products } = await getMenuData(slug);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Promo Popup */}
        <PromoPopup slug={slug} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Restaurant Header */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <img
                src={restaurant.cover}
                alt={restaurant.name}
                className="w-full h-48 md:h-64 object-cover rounded-xl shadow-lg"
              />
            </div>
            <div className="flex items-center justify-center mb-4">
              <img
                src={restaurant.logo}
                alt={`${restaurant.name} logo`}
                className="w-16 h-16 rounded-full object-cover mr-4"
              />
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                  {restaurant.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">{restaurant.address}</p>
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Discover our carefully curated selection of dishes
            </p>
          </div>

          {/* Products Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                {/* Product Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                    ${product.price.toFixed(2)}
                  </div>
                </div>

                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {product.name}
                    </h3>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                    {product.description}
                  </p>

                  {/* Nutrition Info */}
                  <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Nutrition:</p>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{product.nutrition.calories} cal</span>
                      <span>Protein: {product.nutrition.protein}</span>
                      <span>Carbs: {product.nutrition.carbs}</span>
                      <span>Fat: {product.nutrition.fat}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>

                      <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                          />
                        </svg>
                      </button>
                    </div>

                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
          ))}
        </div>

        {/* Categories info */}
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Categories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <span
                key={category.id}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Menu Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The restaurant menu for &quot;{slug}&quot; could not be found.
          </p>
          <Link 
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }
}
