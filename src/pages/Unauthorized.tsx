import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MdLock, MdArrowBack } from 'react-icons/md';

const Unauthorized: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="max-w-md w-full bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <MdLock className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-400">
            You don't have permission to access this page. Please contact your administrator
            if you believe this is a mistake.
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <MdArrowBack className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
