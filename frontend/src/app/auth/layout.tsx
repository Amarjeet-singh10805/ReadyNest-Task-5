import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Authentication' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Auth form */}
      <div className="flex items-center justify-center p-8">
        {children}
      </div>

      {/* Right: Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
            S
          </div>
          <span className="text-xl font-semibold">SaaS Platform</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-2xl font-medium leading-relaxed">
            "The platform that transformed how our team collaborates. Real-time updates and intuitive project management make all the difference."
          </blockquote>
          <footer className="flex items-center gap-3">
            
          </footer>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: '10k+', label: 'Teams' },
            { value: '99.9%', label: 'Uptime' },
            { value: '50M+', label: 'Tasks Done' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-white/70 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
