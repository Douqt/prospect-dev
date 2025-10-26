'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Shield,
  Clock,
  Settings
} from 'lucide-react';

interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string;
  currency: string;
}

interface StripeConnectOnboardingProps {
  mentorId: string;
  onComplete?: () => void;
}

export default function StripeConnectOnboarding({ mentorId, onComplete }: StripeConnectOnboardingProps) {
  const [account, setAccount] = useState<StripeAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string>('');

  const checkStripeStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/mentor-marketplace/stripe/status?mentorId=${mentorId}`);
      const data = await response.json();

      if (data.error) {
        console.error('Error checking Stripe status:', data.error);
      } else {
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mentorId]);

  useEffect(() => {
    checkStripeStatus();
  }, [checkStripeStatus]);

  const handleConnectStripe = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/mentor-marketplace/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mentorId }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.onboardingUrl) {
        setOnboardingUrl(data.onboardingUrl);
        // Redirect to Stripe onboarding
        window.open(data.onboardingUrl, '_blank');

        // Poll for status updates
        pollForStatusUpdate();
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      alert('Failed to connect Stripe account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const pollForStatusUpdate = () => {
    const pollInterval = setInterval(async () => {
      await checkStripeStatus();

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 5 * 60 * 1000);
    }, 5000); // Check every 5 seconds
  };

  const getStatusBadge = () => {
    if (!account) {
      return <Badge variant="destructive">Not Connected</Badge>;
    }

    if (account.charges_enabled && account.payouts_enabled) {
      return <Badge className="bg-green-100 text-green-800">Fully Connected</Badge>;
    }

    if (account.details_submitted) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
    }

    return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
  };

  const getStatusProgress = () => {
    if (!account) return 0;
    if (account.charges_enabled && account.payouts_enabled) return 100;
    if (account.details_submitted) return 75;
    return 25;
  };

  const getStatusDescription = () => {
    if (!account) {
      return 'Connect your Stripe account to start receiving payments from course sales.';
    }

    if (account.charges_enabled && account.payouts_enabled) {
      return 'Your Stripe account is fully connected and ready to receive payments!';
    }

    if (account.details_submitted) {
      return 'Your account information has been submitted and is under review by Stripe.';
    }

    return 'Complete your Stripe account setup to start receiving payments.';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Stripe Connect Setup</h2>
        <p className="text-gray-600">
          Connect your Stripe account to receive payments from course sales
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <CardTitle>Account Status</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Setup Progress</span>
              <span>{getStatusProgress()}%</span>
            </div>
            <Progress value={getStatusProgress()} className="h-2" />
          </div>

          {/* Status Details */}
          {account && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                {account.details_submitted ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-sm">Details Submitted</span>
              </div>

              <div className="flex items-center space-x-2">
                {account.charges_enabled ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm">Can Accept Payments</span>
              </div>

              <div className="flex items-center space-x-2">
                {account.payouts_enabled ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm">Can Receive Payouts</span>
              </div>

              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Account: {account.country}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!account || (!account.charges_enabled && !account.payouts_enabled) ? (
            <Button
              onClick={handleConnectStripe}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                'Connecting...'
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {account ? 'Complete Stripe Setup' : 'Connect Stripe Account'}
                </>
              )}
            </Button>
          ) : (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Your Stripe account is fully connected! You can now receive payments from course sales.
                  Platform commission (20%) will be automatically deducted from each sale.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-medium mb-1">Automatic Payouts</h3>
            <p className="text-sm text-gray-600">
              Receive 80% of course sales directly to your bank account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium mb-1">Secure Processing</h3>
            <p className="text-sm text-gray-600">
              All payments are processed securely through Stripe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Settings className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-medium mb-1">Easy Management</h3>
            <p className="text-sm text-gray-600">
              Manage your earnings and payouts through Stripe dashboard
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      {!account && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What You'll Need</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Government ID</p>
                  <p className="text-sm text-gray-600">Driver's license, passport, or other government-issued ID</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Bank Account</p>
                  <p className="text-sm text-gray-600">Bank statement or voided check for payout setup</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Business Information</p>
                  <p className="text-sm text-gray-600">Basic information about your teaching business</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Preview */}
      {account && (account.charges_enabled || account.payouts_enabled) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">$0.00</p>
                <p className="text-sm text-gray-600">Total Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">$0.00</p>
                <p className="text-sm text-gray-600">Available for Payout</p>
              </div>
            </div>


          </CardContent>
        </Card>
      )}
    </div>
  );
}
