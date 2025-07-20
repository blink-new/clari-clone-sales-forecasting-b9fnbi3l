import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw, CheckCircle } from 'lucide-react'

export function SalesforceIntegration() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salesforce Integration</h1>
          <p className="text-muted-foreground">
            Configure and manage your Salesforce connection
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </Button>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-accent" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current Salesforce integration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">Connected</div>
            <p className="text-sm text-muted-foreground mt-2">
              Last sync: 2 hours ago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Statistics</CardTitle>
            <CardDescription>
              Data synchronization overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Deals synced:</span>
                <span className="text-sm font-medium">247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Contacts synced:</span>
                <span className="text-sm font-medium">1,432</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Opportunities:</span>
                <span className="text-sm font-medium">89</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>
            Configure your Salesforce integration preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Integration Settings Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              Advanced Salesforce configuration options will be available here
            </p>
            <Button variant="outline">
              Configure Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}