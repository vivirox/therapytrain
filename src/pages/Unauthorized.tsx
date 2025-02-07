import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card";
export const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();
    return (<div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This could be because:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
            <li>You don't have the required permissions</li>
            <li>You're not an organization admin</li>
            <li>You're trying to access a restricted area</li>
          </ul>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="default" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>);
};
