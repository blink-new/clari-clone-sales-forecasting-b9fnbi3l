import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Target, Clock } from 'lucide-react'

export function ForecastSubmission() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forecast Submission</h1>
          <p className="text-muted-foreground">
            Submit your sales forecast for the selected period
          </p>
        </div>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          Submit Forecast
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Current Period
            </CardTitle>
            <CardDescription>
              Forecast submission deadline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Q2 2024</div>
            <p className="text-sm text-muted-foreground mt-2">
              Deadline: June 15, 2024
            </p>
            <div className="flex items-center mt-4 text-sm">
              <Clock className="mr-2 h-4 w-4 text-accent" />
              <span>5 days remaining</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Status</CardTitle>
            <CardDescription>
              Your current forecast status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">Draft</div>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: May 20, 2024
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Progress</CardTitle>
            <CardDescription>
              Submission completion rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6/8</div>
            <p className="text-sm text-muted-foreground mt-2">
              Team members submitted
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Submission Form</CardTitle>
          <CardDescription>
            Complete your forecast for the current period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Forecast Form Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              The forecast submission form will be available here
            </p>
            <Button variant="outline">
              Preview Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}