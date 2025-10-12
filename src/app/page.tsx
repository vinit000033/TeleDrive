// app/page.tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Your Self-Deployable Cloud Storage
        </h1>
        <p className="text-lg md:text-xl mb-8">
          Store your files securely using your own Telegram Bot and Channel. Free, unlimited (up to Telegram's limits), and under your control.
        </p>
        <div className="flex justify-center space-x-4">
          <a href="/login">
            <button className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md transition duration-200 hover:opacity-90">
              Get Started
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}