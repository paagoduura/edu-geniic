import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import FloatingFormulas from "@/components/FormulaCarousel";
import { UpgradePremium } from "@/components/UpgradePremium";
import { 
  Sparkles,
  Brain, 
  Trophy, 
  Globe, 
  BookOpen, 
  Star,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Send
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Hero Section */}
      <nav className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center animate-pulse-glow">
              <Star className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
            </div>
            <span className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              EduGenie
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center">
            <Link to="/auth">
              <Button variant="outline" size="sm" className="sm:h-11 sm:px-8">Login</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="shadow-lg sm:h-11 sm:px-8">Get Started</Button>
            </Link>
            <UpgradePremium />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="relative h-[60vh] sm:h-[80vh] overflow-hidden">
          <FloatingFormulas />
        </section>

        {/* Embossed Start Learning CTA */}
        <section className="py-8 sm:py-12 flex justify-center">
          <Link to="/auth" className="group block w-full max-w-2xl">
            <div
              className="relative rounded-2xl px-6 py-5 sm:px-10 sm:py-7 text-center transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
              style={{
                background:
                  "linear-gradient(145deg, hsl(var(--primary) / 0.12), hsl(var(--secondary) / 0.12))",
                boxShadow:
                  "8px 8px 24px hsl(var(--primary) / 0.2), -8px -8px 24px hsl(var(--background) / 0.9), inset 1px 1px 2px hsl(var(--background) / 0.6), inset -1px -1px 2px hsl(var(--primary) / 0.15)",
              }}
            >
              <span className="block text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent drop-shadow-sm">
                Start Learning Now
              </span>
              <span className="mt-2 block text-xs sm:text-sm text-muted-foreground">
                Tap to begin your AI-powered journey
              </span>
            </div>
          </Link>
        </section>

        {/* Features */}
        <section className="py-12 sm:py-20">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Why Choose EduGenie?</h2>
            <p className="text-base sm:text-xl text-muted-foreground px-2">Everything you need for better learning outcomes</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">AI-Generated Lessons</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get personalized lessons created by advanced AI, tailored to your class level and learning pace.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Trophy className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Smart Quizzes</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Adaptive quizzes that adjust difficulty based on your performance. Get instant feedback and improve faster.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Nigerian Context</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All lessons use local examples and follow the NERDC curriculum. Learn with familiar scenarios.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Voice Lessons</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Listen to lessons read aloud in clear Nigerian English. Perfect for audio learners.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mb-6">
                  <Star className="w-8 h-8 text-warning" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Progress Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  See your improvement over time. Parents and teachers can monitor performance in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <CardContent className="pt-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Gamification</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Earn stars, badges, and rewards as you learn. Compete with classmates on leaderboards.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-20">
          <Card className="border-2 bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground overflow-hidden relative">
            <CardContent className="pt-8 pb-8 sm:pt-12 sm:pb-12 px-4 sm:px-6 text-center relative z-10">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-base sm:text-xl mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto">
                Join thousands of Nigerian students already learning smarter with EduGenie
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-xl">
                  Get Started Now - It's Free!
                </Button>
              </Link>
            </CardContent>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full translate-y-48 -translate-x-48" />
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-12 sm:mt-20">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  EduGenie
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Making quality education accessible to every Nigerian student through AI-powered learning.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Curriculum</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Connect With Us</h4>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 EduGenie. All rights reserved. Built for Nigerian students with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
