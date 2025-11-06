import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'CodeForce Terms of Service',
  description: 'CodeForce Terms of Service',
}

export default function TermsOfServicePage() {
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
            <h1 className="text-3xl font-bold mb-2">CodeForce Terms of Service</h1>
            <p className="text-muted-foreground mb-6">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <div className="prose prose-sm max-w-none space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using CodeForce ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Platform.
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                <p className="mb-4">
                  CodeForce is an online marketplace that connects clients seeking development services with verified developers. We facilitate the connection but are not a party to any agreement between clients and developers.
                </p>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
                <div className="space-y-3">
                  <p>To use certain features, you must create an account. You agree to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your information to keep it accurate</li>
                    <li>Maintain the security of your password</li>
                    <li>Accept all responsibility for activities under your account</li>
                    <li>Notify us immediately of any unauthorized use</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Developer Verification</h2>
                <p>
                  Developers must complete our verification process, including identity verification. CodeForce reserves the right to verify, reject, or revoke verification at any time. Verification does not guarantee quality or performance.
                </p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Task Posting and Offers</h2>
                <div className="space-y-3">
                  <p><strong>Clients:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>You may post tasks describing development work needed</li>
                    <li>You are responsible for accurately describing your requirements</li>
                    <li>You may accept or decline offers from developers</li>
                    <li>Once an offer is accepted, you agree to pay the agreed amount</li>
                  </ul>
                  <p className="mt-4"><strong>Developers:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>You may submit offers on posted tasks</li>
                    <li>You are responsible for delivering work as described in your offer</li>
                    <li>You must complete tasks in a professional and timely manner</li>
                    <li>You agree to communicate clearly with clients</li>
                  </ul>
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Payments and Fees</h2>
                <div className="space-y-3">
                  <p>
                    CodeForce uses Stripe Connect to process payments. By using the Platform, you agree to Stripe's terms of service.
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Payments are held in escrow until task completion</li>
                    <li>CodeForce charges a platform fee of 15% on all transactions</li>
                    <li>Stripe processing fees apply (approximately 2.9% + $0.30)</li>
                    <li>Refunds are processed according to our cancellation policy</li>
                    <li>Developers must set up a Stripe Connect account to receive payments</li>
                  </ul>
                </div>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Cancellation and Refunds</h2>
                <div className="space-y-3">
                  <p>Tasks may be cancelled by either party under the following conditions:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Clients may cancel before work begins for a full refund</li>
                    <li>If work has started, refunds are at the discretion of both parties</li>
                    <li>CodeForce may mediate disputes on a case-by-case basis</li>
                    <li>Platform fees are non-refundable except in cases of fraud</li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
                <p>
                  Work completed through the Platform belongs to the client who commissioned it, unless otherwise agreed in writing. Developers retain the right to showcase completed work in their portfolio.
                </p>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Prohibited Activities</h2>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Post false, misleading, or fraudulent information</li>
                  <li>Circumvent payment processing or fees</li>
                  <li>Engage in any illegal activities</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Share contact information to avoid platform fees</li>
                  <li>Spam or send unsolicited communications</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </section>

              {/* Section 10 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
                <p>
                  In case of disputes between clients and developers, CodeForce may provide mediation services. However, we are not obligated to resolve disputes. Users are encouraged to resolve issues directly. If mediation is needed, contact support.
                </p>
              </section>

              {/* Section 11 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
                <p>
                  CodeForce acts as a marketplace platform and is not responsible for the quality, safety, or legality of services provided. We are not liable for any damages arising from use of the Platform or services obtained through it.
                </p>
              </section>

              {/* Section 12 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Indemnification</h2>
                <p>
                  You agree to indemnify and hold CodeForce harmless from any claims, damages, or expenses arising from your use of the Platform or violation of these Terms.
                </p>
              </section>

              {/* Section 13 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">13. Termination</h2>
                <p>
                  We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason. You may terminate your account at any time by contacting support.
                </p>
              </section>

              {/* Section 14 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notification. Continued use after changes constitutes acceptance.
                </p>
              </section>

              {/* Section 15 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
                <p className="mb-4">
                  If you have questions about these Terms, please contact us at:
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-semibold mb-1">Legal Department</p>
                  <p>CodeForce, Inc.</p>
                  <p className="mt-2">
                    Email: <a href="mailto:legal@codeforce.com" className="text-primary hover:underline">legal@codeforce.com</a>
                  </p>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-6 mt-8">
                <p className="text-sm text-muted-foreground">
                  By using CodeForce, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Terms of Service</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-foreground">Contact Us</Link>
        </div>
      </main>
    </div>
  )
}

