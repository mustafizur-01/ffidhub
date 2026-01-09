import Header from '@/components/Header';
import VerifyForm from '@/components/VerifyForm';
import { UserCheck, Shield, BadgeCheck } from 'lucide-react';

const VerifyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-10">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 animate-pulse-glow">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Get Your <span className="text-gradient">Member Code</span>
            </h1>
            <p className="text-muted-foreground">
              Verify your identity and become a trusted member
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="card-gaming p-4 text-center">
              <Shield className="h-6 w-6 text-gaming-success mx-auto mb-2" />
              <p className="text-sm font-medium">Trusted Status</p>
            </div>
            <div className="card-gaming p-4 text-center">
              <BadgeCheck className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Unique Code</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="card-gaming p-6 md:p-8">
            <VerifyForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
