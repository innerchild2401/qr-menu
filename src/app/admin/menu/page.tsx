'use client';

export default function AdminMenu() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Menu Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your restaurant menu items and categories
        </p>
      </div>

      {/* Add New Item Button */}
      <div className="mb-6">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
          + Add New Menu Item
        </button>
      </div>

      {/* Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Categories
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Appetizers', 'Main Courses', 'Desserts', 'Beverages'].map((category) => (
            <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white">{category}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {Math.floor(Math.random() * 8) + 1} items
              </p>
              <button className="text-blue-600 hover:text-blue-700 text-sm mt-2">
                Manage →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Menu Items
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Price</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Grilled Salmon', category: 'Main Courses', price: '$24.99', status: 'Active' },
                { name: 'Truffle Pasta', category: 'Main Courses', price: '$32.99', status: 'Active' },
                { name: 'Caesar Salad', category: 'Appetizers', price: '$16.99', status: 'Active' },
                { name: 'Chocolate Soufflé', category: 'Desserts', price: '$14.99', status: 'Active' },
              ].map((item, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{item.name}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{item.category}</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{item.price}</td>
                  <td className="py-3 px-4">
                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full text-xs">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                      <button className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
