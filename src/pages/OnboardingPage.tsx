import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ESP32Onboarding } from '@/components/onboarding/ESP32Onboarding';
import { 
  Waves, 
  CheckCircle, 
  Cpu, 
  Upload, 
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: 'Welcome to AquaNexus',
      description: 'Your IoT-driven aquaponics monitoring platform',
      icon: Waves,
      color: 'text-blue-600'
    },
    {
      id: 2,
      title: 'Connect ESP32 Device',
      description: 'Set up your IoT sensors for real-time monitoring',
      icon: Cpu,
      color: 'text-green-600'
    },
    {
      id: 3,
      title: 'Import Historical Data',
      description: 'Upload your existing aquaponics data (optional)',
      icon: Upload,
      color: 'text-purple-600'
    },
    {
      id: 4,
      title: 'Start Monitoring',
      description: 'Access your dashboard and begin monitoring',
      icon: BarChart3,
      color: 'text-orange-600'
    }
  ];

  const completeStep = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    
    if (stepId < steps.length) {
      setCurrentStep(stepId + 1);
    }
  };

  const skipToStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const finishOnboarding = () => {
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <Waves className="h-12 w-12 text-blue-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to AquaNexus, {user?.name}!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Let's get your aquaponics monitoring system set up. This will only take a few minutes.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What you'll set up:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• ESP32 IoT device for real-time monitoring</li>
                <li>• Historical data import (optional)</li>
                <li>• Dashboard configuration</li>
              </ul>
            </div>
            
            <Button onClick={() => completeStep(1)} className="w-full">
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Connect Your ESP32 Device
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Set up your IoT sensors for real-time aquaponics monitoring
              </p>
            </div>
            
            <ESP32Onboarding onComplete={() => completeStep(2)} />
            
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => skipToStep(3)}
                className="w-full"
              >
                Skip for now (you can add devices later)
              </Button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="bg-purple-100 dark:bg-purple-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <Upload className="h-12 w-12 text-purple-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Import Historical Data
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Upload your existing aquaponics data to get insights and track trends over time.
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-left">
              <h3 className="font-medium mb-2">Supported formats:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• CSV files with timestamp, sensor readings</li>
                <li>• JSON files with structured data</li>
                <li>• Excel files (.xlsx)</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  navigate('/data-import');
                  completeStep(3);
                }}
                className="flex-1"
              >
                Import Data
              </Button>
              <Button 
                variant="outline" 
                onClick={() => completeStep(3)}
                className="flex-1"
              >
                Skip
              </Button>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're All Set!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Your AquaNexus monitoring system is ready. Start monitoring your aquaponics environment in real-time.
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What's next:</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• View real-time sensor data on your dashboard</li>
                <li>• Set up alerts for critical parameters</li>
                <li>• Analyze trends with AI-powered insights</li>
                <li>• Manage multiple aquaponics projects</li>
              </ul>
            </div>
            
            <Button onClick={finishOnboarding} className="w-full">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-blue-900 dark:to-teal-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const IconComponent = step.icon;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                      isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <IconComponent className="h-6 w-6" />
                    )}
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div 
                      className={`w-16 h-1 mx-2 transition-all ${
                        isCompleted || (isCurrent && index < currentStep - 1)
                          ? 'bg-green-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.id} className="text-center" style={{ width: '12rem' }}>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;