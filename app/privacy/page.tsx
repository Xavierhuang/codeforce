'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50 safe-area-inset-top">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="Skillyy" className="h-8 md:h-[50px] w-auto" />
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/tasks" className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
              Browse Tasks
            </Link>
            <Link href="/developers" className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
              Find Developers
            </Link>
            <Link href="/auth/signin">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-[#94FE0C] hover:bg-[#7FE00A] text-gray-900">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            ← Back to Home
          </Link>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Skillyy Global Privacy Policy</h1>
            <p className="text-muted-foreground mb-6">
              Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>

            <div className="prose prose-sm max-w-none space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="mb-4">
                  This Global Privacy Policy ("Privacy Policy") describes how Skillyy, Inc. ("Skillyy," "we," "our," or "us") collects, uses, retains, discloses, and deletes your Personal Information on the Skillyy website and mobile applications (the "Platform"). It also explains your legal rights and options with respect to your information depending on where you reside.
                </p>
                <p>
                  By using the Platform, you confirm that you have read and understood this Privacy Policy, and each applicable Terms of Service (together referred to as the "Agreement").
                </p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">2. General Terms</h2>
                <p className="mb-4">In this Privacy Policy:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Skillyy, Inc. is referred to as "Skillyy," "we," "our," or "us."</li>
                  <li>Users of the Platform (Clients and Developers) as "You."</li>
                  <li>The "Platform" refers to Skillyy's websites and mobile applications.</li>
                  <li>"Terms of Service" refers to the applicable legal terms you agree to when you use our products or services.</li>
                  <li>"Personal Information" is information that can directly or indirectly identify, or can reasonably identify, an individual, to the extent regulated under applicable privacy laws.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Collection of Personal Information</h2>
                <p className="mb-4">
                  We collect personal information directly from you when you provide it to us or from your use of the Platform. Some examples of Personal Information we collect includes the following:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Contact Information</h3>
                    <p>Such as your first and last name, email address, physical address, and phone number which is needed to set up an account.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Billing Information</h3>
                    <p>Such as your credit or debit card number, expiration date, security code, and zip code.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Identity Information</h3>
                    <p>Such as your date of birth, and depending on where you reside, your social security, tax ID number, VAT ID number, or social insurance number, and photo of your ID document such as your passport, local ID, or driver's license (for developer verification).</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Professional Information</h3>
                    <p>If you are a Developer, we collect information about your skills, experience level, portfolio, availability, rates, and completed tasks.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">User Generated Content Information</h3>
                    <p>Such as information submitted via email or chat messages between you and us or between you and other users. This can include photos, code snippets, or files shared between users related to the performance of a Task.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Booking Information</h3>
                    <p>Such as information about the task or project you are seeking or offering, including the time, date, location (for in-person tasks), description, and requirements.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Data from Cookies and Similar Technologies</h3>
                    <p>As described in our Cookie Policy, which sets out the different categories of cookies and similar technologies that the Platform uses and why we use them.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Device Data</h3>
                    <p>Including data about the type of device or browser you use, your device's operating system, internet service provider, device's regional and language settings, and device identifiers such as IP address and AD ID.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Location Data</h3>
                    <p>Including location data such as those derived from an IP address or data that indicates a city or postal code level or latitude/longitude data (for in-person tasks).</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Service Use Data</h3>
                    <p>Including your activities on the Platform's features and webpages, the time of day you browse, and emails and advertisements that you view and may interact with.</p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Use of Personal Information</h2>
                <p className="mb-4">
                  We use your Personal Information for business and commercial purposes, which includes the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To operate and make available the Platform</li>
                  <li>To connect you with other users to fulfill a Task or Project</li>
                  <li>To personalize your experience on the Platform</li>
                  <li>For billing and fraud prevention to ensure a safe and secure environment to facilitate financial transactions</li>
                  <li>To conduct identification and verification checks, as permitted by applicable laws</li>
                  <li>To ensure the safety of our users both online and offline</li>
                  <li>To maintain the integrity of the Platform</li>
                  <li>For analysis to improve the Platform</li>
                  <li>To contact you with transactional and promotional communications</li>
                  <li>To provide you with customer support, and to assist in the resolution of your, or a third party's, complaints</li>
                  <li>To advertise our Platform's or a partner's products or services that we think might interest you</li>
                  <li>To enforce the relevant Terms of Service</li>
                  <li>As otherwise set forth in other terms of the Agreement or as otherwise permitted under applicable laws</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Disclosure of Personal Information</h2>
                <p className="mb-4">
                  We share your Personal Information with third parties for the following purposes:
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Service Providers</h3>
                    <p>To operate the Platform and process Personal Information in accordance with CodeForce's instructions and on its behalf, such as:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>Email origination</li>
                      <li>Identity verification and background checks as permitted under applicable laws</li>
                      <li>Fraud prevention and detection</li>
                      <li>Payment processing and financial transaction fulfillment</li>
                      <li>Customer relationship management services</li>
                      <li>Data analytics</li>
                      <li>Marketing and advertising</li>
                      <li>Website hosting</li>
                      <li>Communications services (including SMS notifications via Twilio)</li>
                      <li>Technical support</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Other Users</h3>
                    <p>We may share your contact information with another user, or their legal or other authorized representative, to resolve an investigation or dispute related to, or arising from, an interaction between you and another user of the Platform.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Legal Obligations</h3>
                    <p>We may disclose your Personal Information to comply with applicable laws, or as requested by courts, law enforcement, governmental or public authorities, tax authorities, or authorized third parties, to the extent permitted under applicable laws.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Merger or Acquisition</h3>
                    <p>We may also share your Personal Information with interested parties in connection with, or during negotiations of, any proposed or actual merger, purchase, or sale of all or any portion of our assets to another business.</p>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Retention of Personal Information</h2>
                <p>
                  We retain your Personal Information for as long as necessary to provide you with our products or services and fulfill the purposes described in this Privacy Policy. When we no longer need to use your information and there is no need for us to keep it to comply with our legal obligations or to the extent permitted under applicable laws, we'll either delete it from our systems or deidentify it so that we can't use it to reidentify you.
                </p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
                <p className="mb-4">
                  Depending on where you live, you may have certain privacy rights under regional or local law.
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Opt-Out of Promotional Communications</h3>
                    <p className="mb-2">
                      You may opt-out of receiving promotional updates via email, SMS, or push notifications by visiting the "Notifications" page in your Account Settings and setting your preferences. Other opt-out mechanisms include:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Opt out of promotional email marketing by clicking on the unsubscribe link in the email</li>
                      <li>Opt out of promotional text messages by following the instructions provided in those messages to text the word "STOP"</li>
                    </ul>
                    <p className="mt-2">
                      We may still continue to send you transactional communications, such as those about your account, Tasks, transactions, servicing, or ongoing business relationship with you.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Right to Access and Data Portability</h3>
                    <p>You have the right to access the Personal Information we have about you. You may request:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>The categories of Personal Information we have collected about you</li>
                      <li>The categories of sources from which the Personal Information was collected</li>
                      <li>The categories of Personal Information about you we disclosed for a business purpose</li>
                      <li>The categories of third parties to whom the Personal Information was disclosed</li>
                      <li>The business or commercial purpose for collecting the Personal Information</li>
                      <li>The specific pieces of Personal Information we have collected about you</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Right to Correct</h3>
                    <p>You have the right to update and correct inaccuracies in your account at any time by logging in and clicking on the "Account" tab. There, you can view, update, and correct your account information.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Right to Delete</h3>
                    <p>You have the right to delete the Personal Information we have about you. Please note we may retain certain Personal Information to comply with our legal obligations or to the extent permitted under applicable laws.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Right to Non-Discrimination</h3>
                    <p>You have the right to non-discriminatory treatment by us should you exercise any of these rights.</p>
                  </div>
                </div>

                <p className="mt-4">
                  To exercise any of these rights, please submit a request to <a href="mailto:privacy@skillyy.com" className="text-primary hover:underline">privacy@skillyy.com</a>. We may require specific information from you to help us verify your identity and process your request. If we are unable to verify your identity, we may deny your request.
                </p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Contacting Us</h2>
                <p className="mb-4">
                  If you have any questions about this policy or our privacy practices, you may contact us at:
                </p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-semibold mb-1">Attn: Legal</p>
                  <p>Skillyy, Inc.</p>
                  <p>Privacy Department</p>
                  <p className="mt-2">
                    Email: <a href="mailto:privacy@skillyy.com" className="text-primary hover:underline">privacy@skillyy.com</a>
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Jurisdiction-Specific Provisions</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Residents of the United States</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-1">California Residents</h4>
                        <p>California residents may request a list of the categories of Personal Information disclosed by us to third parties during the immediately preceding calendar year for those third parties' own direct marketing purposes. To exercise a request, please submit a request to <a href="mailto:privacy@skillyy.com" className="text-primary hover:underline">privacy@skillyy.com</a>. We may request additional information to verify your identity and confirm your California residence.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Residents of Canada</h3>
                    <p>We and our affiliates primarily store your Personal Information on servers located and operated within the United States to provide and operate the Platform. By accepting the terms of this Privacy Policy, you acknowledge the transfer to and processing of your Personal Information on servers located in the U.S.</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Residents of the European Economic Area (EEA), Switzerland, and the United Kingdom</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-1">Legal Bases for Using Your Personal Information</h4>
                        <p className="mb-2">In accordance with the General Data Protection Regulation ("GDPR") and the United Kingdom General Data Protection Regulation ("UK GDPR"), we rely on the following legal basis for processing your Personal Information:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li><strong>Performance of a Contract:</strong> To operate the Platform and connect you with other users</li>
                          <li><strong>Consent:</strong> For promotional communications and marketing</li>
                          <li><strong>Legal Obligations:</strong> For billing, fraud prevention, and safety</li>
                          <li><strong>Legitimate Interests:</strong> To improve the Platform and provide customer support</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Your Rights</h4>
                        <p>You have the right to access, correct, delete, object to processing, and withdraw consent. You also have the right to lodge a complaint with your local supervisory authority.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-6 mt-8">
                <p className="text-sm text-muted-foreground">
                  This Privacy Policy is effective as of the date stated above and may be updated from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Links */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center md:justify-start">
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

