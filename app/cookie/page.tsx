import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'CodeForce Cookie Policy',
  description: 'CodeForce Cookie Policy',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            CodeForce
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/tasks" className="text-sm font-medium hover:text-primary">
              Browse Tasks
            </Link>
            <Link href="/developers" className="text-sm font-medium hover:text-primary">
              Find Developers
            </Link>
            <Link href="/auth/signin">
              <span className="text-sm font-medium hover:text-primary">Sign In</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <h1 className="text-3xl font-bold mb-2">CodeForce Cookie Policy</h1>
            <p className="text-muted-foreground mb-6">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <div className="prose prose-sm max-w-none space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
                <p>
                  Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
                <p className="mb-4">CodeForce uses cookies for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for the Platform to function properly, including authentication and session management</li>
                  <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our Platform to improve performance</li>
                  <li><strong>Functionality Cookies:</strong> Remember your preferences and settings</li>
                  <li><strong>Analytics Cookies:</strong> Collect information about how you use our Platform</li>
                  <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Session Cookies</h3>
                    <p>Temporary cookies that expire when you close your browser. We use these for authentication and session management.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Persistent Cookies</h3>
                    <p>Cookies that remain on your device for a set period. We use these to remember your preferences and login status.</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Third-Party Cookies</h3>
                    <p>Cookies set by third-party services we use, such as analytics providers and payment processors.</p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
                <p className="mb-4">We use the following third-party services that may set cookies:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Stripe:</strong> Payment processing and fraud prevention</li>
                  <li><strong>NextAuth.js:</strong> Authentication and session management</li>
                  <li><strong>Analytics Services:</strong> To understand Platform usage and improve our services</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Managing Cookies</h2>
                <p className="mb-4">You can control and manage cookies in several ways:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies. Check your browser's help section for instructions.</li>
                  <li><strong>Platform Settings:</strong> Some cookie preferences can be managed through your account settings.</li>
                  <li><strong>Opt-Out Tools:</strong> Various tools are available to help you opt out of certain cookies.</li>
                </ul>
                <p className="mt-4">
                  <strong>Note:</strong> Disabling certain cookies may affect the functionality of the Platform. Essential cookies cannot be disabled as they are necessary for the Platform to function.
                </p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Your Choices</h2>
                <p>
                  You have the right to accept or reject cookies. Most web browsers automatically accept cookies, but you can modify your browser settings to decline cookies if you prefer. However, this may prevent you from taking full advantage of the Platform.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Updates to This Policy</h2>
                <p>
                  We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
                <p className="mb-4">
                  If you have questions about our use of cookies, please contact us at:
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-semibold mb-1">Privacy Department</p>
                  <p>CodeForce, Inc.</p>
                  <p className="mt-2">
                    Email: <a href="mailto:privacy@codeforce.com" className="text-primary hover:underline">privacy@codeforce.com</a>
                  </p>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-6 mt-8">
                <p className="text-sm text-muted-foreground">
                  For more information about cookies and how they work, visit <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.allaboutcookies.org</a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
        </div>
      </main>
    </div>
  )
}

