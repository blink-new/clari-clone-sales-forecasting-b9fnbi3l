import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, Plus, Filter } from 'lucide-react'

export function DealManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deal Management</h1>
          <p className="text-muted-foreground">
            Select and manage deals for your forecast
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter Deals
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salesforce Deal Pipeline</CardTitle>
          <CardDescription>
            Select deals to include in your forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Deal Pipeline Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              Salesforce integration and deal selection will be available here
            </p>
            <Button variant="outline">
              Connect Salesforce
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}