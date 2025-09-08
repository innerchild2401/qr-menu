'use client';

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Brain, 
  Settings, 
  Sparkles, 
  ArrowRight, 
  CheckCircle
} from "lucide-react";
import { layout, typography, gaps } from "@/lib/design-system";

export default function Home() {

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className={`${layout.container} pt-16 pb-16`}>
            <div className="text-center">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="w-3 h-3 mr-1" />
                Upload. Customize. Sell.
              </Badge>
              
              <h1 className={`${typography.h1} mb-6`}>
                The Fastest Way to Get
                <span className="text-primary block">Your Digital Menu Live</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
                Upload. Customize. Sell. Turn your paper menu into an interactive QR experience in 5 minutes.
              </p>

              <div className={`flex flex-col sm:flex-row ${gaps.sm} justify-center items-center mb-12`}>
                <Button size="lg" asChild className="text-lg px-8 py-6">
                  <Link href="/admin/settings">
                    Start Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6">
                  <Link href="/menu/demo">
                    View Demo Menu
                  </Link>
                </Button>
              </div>

              {/* Hero Image */}
              <div className="relative max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border">
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Interactive Digital Menu Preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={`${layout.section} bg-white`}>
          <div className={layout.container}>
            <div className="text-center mb-16">
              <h2 className={`${typography.h2} mb-4`}>
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to get your digital menu live and driving sales.
              </p>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 ${gaps.lg}`}>
              <Card className={`${layout.card} ${layout.cardHover}`}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Step 1: Upload</CardTitle>
                  <CardDescription>
                    Upload your .xls or .csv menu — no fixed structure required. Ready in 5 clicks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Bulk uploads in seconds
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Drag, drop, done
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      No fixed structure required
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className={`${layout.card} ${layout.cardHover}`}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Step 2: Customize</CardTitle>
                  <CardDescription>
                    Customize and reorder products easily — highlight what matters most.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Total control over product order
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Easy drag & drop reordering
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Highlight your best sellers
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className={`${layout.card} ${layout.cardHover}`}>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>Step 3: Sell</CardTitle>
                  <CardDescription>
                    Use popups to promote specials, events, or discounts directly in your QR menu.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Built-in marketing with engaging popups
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Promote specials and events
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Drive more sales with targeted offers
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`${layout.section} bg-gradient-to-r from-primary to-blue-600`}>
          <div className={layout.container}>
            <div className={`grid grid-cols-1 md:grid-cols-3 ${gaps.lg} text-center`}>
              <div className="text-white">
                <div className="text-4xl font-bold mb-2">5</div>
                <div className="text-blue-100">Minutes to Live</div>
              </div>
              <div className="text-white">
                <div className="text-4xl font-bold mb-2">0</div>
                <div className="text-blue-100">Coding Required</div>
              </div>
              <div className="text-white">
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-blue-100">Customer Focused</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to launch your QR menu?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              No coding. No stress. Just customers.
            </p>
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link href="/admin/settings">
                Start Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-muted border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">SmartMenu</span>
                </div>
                <p className="text-muted-foreground">
                  The future of restaurant menu management.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="/menu/demo" className="hover:text-foreground">Demo Menu</Link></li>
                  <li><Link href="#features" className="hover:text-foreground">Features</Link></li>
                  <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="#" className="hover:text-foreground">Help Center</Link></li>
                  <li><Link href="#" className="hover:text-foreground">Contact Us</Link></li>
                  <li><Link href="#" className="hover:text-foreground">Documentation</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li><Link href="#" className="hover:text-foreground">About</Link></li>
                  <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                  <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
              <p>&copy; 2024 SmartMenu. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
