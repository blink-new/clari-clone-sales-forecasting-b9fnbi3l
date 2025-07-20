import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  DollarSign, 
  Calendar,
  Eye,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface SalesforceManager {
  Id: string;
  Name: string;
  Email: string;
  Title?: string;
}

interface SalesforceUser {
  Id: string;
  Name: string;
  Email: string;
  Title?: string;
  Department?: string;
}

interface SalesforceOpportunity {
  Id: string;
  Name: string;
  Amount: number;
  CloseDate: string;
  StageName: string;
  Probability: number;
  AccountId: string;
  Account?: {
    Name: string;
  };
  OwnerId: string;
  Owner?: {
    Name: string;
    Email: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
  Type?: string;
  LeadSource?: string;
  Description?: string;
}

interface TeamDealsData {
  teamMembers: SalesforceUser[];
  deals: SalesforceOpportunity[];
  totalRecords: number;
}

const SALESFORCE_FUNCTION_URL = 'https://b9fnbi3l--salesforce-deals.functions.blink.new';

export function SalesforceIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [managers, setManagers] = useState<SalesforceManager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [teamDealsData, setTeamDealsData] = useState<TeamDealsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState<SalesforceOpportunity | null>(null);

  // Test Salesforce connection
  const testConnection = async () => {
    setConnectionStatus('connecting');
    setError('');
    
    try {
      const response = await fetch(`${SALESFORCE_FUNCTION_URL}?action=getManagers`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setManagers(data.managers || []);
      setConnectionStatus('connected');
      toast.success('Successfully connected to Salesforce!');
      
    } catch (err) {
      console.error('Salesforce connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Salesforce');
      setConnectionStatus('error');
      toast.error('Failed to connect to Salesforce');
    }
  };

  // Fetch team deals for selected manager
  const fetchTeamDeals = async (managerId: string) => {
    if (!managerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${SALESFORCE_FUNCTION_URL}?action=getTeamDeals&managerId=${managerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setTeamDealsData(data);
      toast.success(`Loaded ${data.deals.length} deals for team`);
      
    } catch (err) {
      console.error('Error fetching team deals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team deals');
      toast.error('Failed to fetch team deals');
    } finally {
      setLoading(false);
    }
  };

  // Handle manager selection
  const handleManagerSelect = (managerId: string) => {
    setSelectedManager(managerId);
    fetchTeamDeals(managerId);
  };

  // Filter deals based on search and stage
  const filteredDeals = teamDealsData?.deals.filter(deal => {
    const matchesSearch = deal.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.Account?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.Owner?.Name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || deal.StageName === stageFilter;
    
    return matchesSearch && matchesStage;
  }) || [];

  // Get unique stages for filter
  const uniqueStages = [...new Set(teamDealsData?.deals.map(deal => deal.StageName) || [])];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get stage color
  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Prospecting': 'bg-gray-100 text-gray-800',
      'Qualification': 'bg-blue-100 text-blue-800',
      'Needs Analysis': 'bg-yellow-100 text-yellow-800',
      'Value Proposition': 'bg-orange-100 text-orange-800',
      'Id. Decision Makers': 'bg-purple-100 text-purple-800',
      'Perception Analysis': 'bg-pink-100 text-pink-800',
      'Proposal/Price Quote': 'bg-indigo-100 text-indigo-800',
      'Negotiation/Review': 'bg-red-100 text-red-800',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-gray-100 text-gray-800',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Salesforce Integration</h1>
        <p className="text-muted-foreground">
          Connect to Salesforce and manage deals for your sales team
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Test and manage your Salesforce connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Connected</span>
                </>
              )}
              {connectionStatus === 'connecting' && (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <span className="text-blue-600 font-medium">Connecting...</span>
                </>
              )}
              {connectionStatus === 'disconnected' && (
                <>
                  <AlertCircle className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-600 font-medium">Disconnected</span>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">Connection Error</span>
                </>
              )}
            </div>
            
            <Button 
              onClick={testConnection}
              disabled={connectionStatus === 'connecting'}
              variant={connectionStatus === 'connected' ? 'outline' : 'default'}
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {connectionStatus === 'connected' ? 'Refresh' : 'Test Connection'}
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Manager Selection */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Sales Manager
            </CardTitle>
            <CardDescription>
              Choose a sales manager to view their team's deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="manager">Sales Manager</Label>
                <Select value={selectedManager} onValueChange={handleManagerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.Id} value={manager.Id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{manager.Name}</span>
                          <span className="text-sm text-muted-foreground">{manager.Email}</span>
                          {manager.Title && (
                            <span className="text-xs text-muted-foreground">{manager.Title}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Overview */}
      {teamDealsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamDealsData.teamMembers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamDealsData.deals.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(teamDealsData.deals.reduce((sum, deal) => sum + (deal.Amount || 0), 0))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamDealsData.deals.length > 0 
                  ? formatCurrency(teamDealsData.deals.reduce((sum, deal) => sum + (deal.Amount || 0), 0) / teamDealsData.deals.length)
                  : '$0'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deals Table */}
      {teamDealsData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Team Deals
            </CardTitle>
            <CardDescription>
              All open opportunities for the selected manager's team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search deals, accounts, or owners..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {uniqueStages.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Close Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No deals found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDeals.map((deal) => (
                        <TableRow key={deal.Id}>
                          <TableCell className="font-medium">{deal.Name}</TableCell>
                          <TableCell>{deal.Account?.Name || 'N/A'}</TableCell>
                          <TableCell>{deal.Owner?.Name || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(deal.Amount || 0)}</TableCell>
                          <TableCell>
                            <Badge className={getStageColor(deal.StageName)}>
                              {deal.StageName}
                            </Badge>
                          </TableCell>
                          <TableCell>{deal.Probability}%</TableCell>
                          <TableCell>{formatDate(deal.CloseDate)}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{deal.Name}</DialogTitle>
                                  <DialogDescription>
                                    Deal details from Salesforce
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Account</Label>
                                      <p className="text-sm text-muted-foreground">{deal.Account?.Name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Owner</Label>
                                      <p className="text-sm text-muted-foreground">{deal.Owner?.Name || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Amount</Label>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(deal.Amount || 0)}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Probability</Label>
                                      <p className="text-sm text-muted-foreground">{deal.Probability}%</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Close Date</Label>
                                      <p className="text-sm text-muted-foreground">{formatDate(deal.CloseDate)}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Stage</Label>
                                      <Badge className={getStageColor(deal.StageName)}>
                                        {deal.StageName}
                                      </Badge>
                                    </div>
                                  </div>
                                  {deal.Description && (
                                    <div>
                                      <Label className="text-sm font-medium">Description</Label>
                                      <p className="text-sm text-muted-foreground mt-1">{deal.Description}</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}