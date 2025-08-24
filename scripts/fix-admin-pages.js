const fs = require('fs');
const path = require('path');

const adminPages = [
  'src/app/admin/products/page.tsx',
  'src/app/admin/qr/page.tsx',
  'src/app/admin/checklist/page.tsx',
  'src/app/admin/popups/page.tsx'
];

function fixAdminPage(filePath) {
  console.log(`🔧 Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace useSession import with supabase import
  content = content.replace(
    "import { useSession } from 'next-auth/react';",
    "import { supabase } from '@/lib/auth-supabase';"
  );
  
  // Replace session usage with user state
  content = content.replace(
    /const \{ data: session \} = useSession\(\);/g,
    'const [user, setUser] = useState<any>(null);'
  );
  
  // Replace session?.restaurantSlug with user check
  content = content.replace(
    /if \(session\?\.restaurantSlug\)/g,
    'if (user)'
  );
  
  // Add session management
  const sessionManagementCode = `
  // Load user session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);`;
  
  // Find the useEffect that depends on session and replace it
  content = content.replace(
    /useEffect\(\(\) => \{[\s\S]*?if \(session\?\.restaurantSlug\)[\s\S]*?\}, \[session[^\]]*\]\);/g,
    sessionManagementCode
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
}

// Fix all admin pages
adminPages.forEach(fixAdminPage);

console.log('\n🎉 All admin pages have been updated to use Supabase!');
