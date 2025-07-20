import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  DollarSign, 
  Users,
  TrendingUp,
  Search,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { blink } from '@/blink/client';

interface SalesforceManager {
  Id: string;
  Name: string;
  Email: string;
  Title?: string;
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
  teamMembers: any[];
  deals: SalesforceOpportunity[];
  totalRecords: number;
}

const SALESFORCE_FUNCTION_URL = 'https://b9fnbi3l--salesforce-deals.functions.blink.new';

export function DealManagement() {
  const [managers, setManagers] = useState<SalesforceManager[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [salesforceDeals, setSalesforceDeals] = useState<SalesforceOpportunity[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [probabilityFilter, setProbabilityFilter] = useState('all');

  const initializeDatabase = async () => {
    try {
      await blink.runSql(`
        CREATE TABLE IF NOT EXISTS forecast_deals (
          id TEXT PRIMARY KEY,
          salesforce_id TEXT NOT NULL,
          deal_name TEXT NOT NULL,
          account_name TEXT,
          owner_name TEXT,
          amount REAL NOT NULL,
          probability INTEGER NOT NULL,
          close_date TEXT NOT NULL,
          stage TEXT NOT NULL,
          forecast_amount REAL NOT NULL,
          included_in_forecast INTEGER DEFAULT 1,
          manager_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await fetch(`${SALESFORCE_FUNCTION_URL}?action=getManagers`);
      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers || []);
      }
    } catch (err) {
      console.error('Error loading managers:', err);
    }
  };

  // Initialize database tables
  useEffect(() => {
    initializeDatabase();
    loadManagers();
  }, []);

  const loadTeamDeals = async (managerId: string) => {
    if (!managerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Load Salesforce deals
      const response = await fetch(`${SALESFORCE_FUNCTION_URL}?action=getTeamDeals&managerId=${managerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: TeamDealsData = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSalesforceDeals(data.deals);
      
      // Load existing forecast deals from database
      const user = await blink.auth.me();
      const existingDealsResult = await blink.runSql(`
        SELECT * FROM forecast_deals 
        WHERE manager_id = ? AND user_id = ?
      `, [managerId, user.id]);
      
      const existingDeals = existingDealsResult.rows || [];
      
      // Set selected deals based on existing forecast
      const selectedIds = new Set(existingDeals
        .filter((deal: any) => Number(deal.included_in_forecast) > 0)
        .map((deal: any) => deal.salesforce_id)
      );
      setSelectedDeals(selectedIds);
      
      toast.success(`Loaded ${data.deals.length} deals for team`);
      
    } catch (err) {
      console.error('Error loading team deals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team deals');
      toast.error('Failed to load team deals');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerSelect = (managerId: string) => {
    setSelectedManager(managerId);
    loadTeamDeals(managerId);
  };

  const toggleDealSelection = (dealId: string) => {
    const newSelected = new Set(selectedDeals);
    if (newSelected.has(dealId)) {
      newSelected.delete(dealId);
    } else {
      newSelected.add(dealId);
    }
    setSelectedDeals(newSelected);
  };

  const saveForecastDeals = async () => {
    if (!selectedManager) {
      toast.error('Please select a manager first');
      return;
    }

    setSaving(true);
    
    try {
      const user = await blink.auth.me();
      
      // Delete existing forecast deals for this manager
      await blink.runSql(`
        DELETE FROM forecast_deals 
        WHERE manager_id = ? AND user_id = ?
      `, [selectedManager, user.id]);
      
      // Insert selected deals
      const selectedSalesforceDeals = salesforceDeals.filter(deal => 
        selectedDeals.has(deal.Id)
      );
      
      for (const deal of selectedSalesforceDeals) {
        const forecastAmount = (deal.Amount || 0) * (deal.Probability / 100);
        
        await blink.runSql(`
          INSERT INTO forecast_deals (
            id, salesforce_id, deal_name, account_name, owner_name,
            amount, probability, close_date, stage, forecast_amount,
            included_in_forecast, manager_id, user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `forecast_${deal.Id}_${Date.now()}`,
          deal.Id,
          deal.Name,
          deal.Account?.Name || '',
          deal.Owner?.Name || '',
          deal.Amount || 0,
          deal.Probability,
          deal.CloseDate,
          deal.StageName,
          forecastAmount,
          1,
          selectedManager,
          user.id,
          new Date().toISOString(),
          new Date().toISOString()
        ]);
      }
      
      toast.success(`Saved ${selectedSalesforceDeals.length} deals to forecast`);
      
      // Reload forecast deals
      loadTeamDeals(selectedManager);
      
    } catch (err) {
      console.error('Error saving forecast deals:', err);
      toast.error('Failed to save forecast deals');
    } finally {
      setSaving(false);
    }
  };

  // Filter deals
  const filteredDeals = salesforceDeals.filter(deal => {
    const matchesSearch = deal.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.Account?.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.Owner?.Name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || deal.StageName === stageFilter;
    
    const matchesProbability = probabilityFilter === 'all' || 
      (probabilityFilter === 'high' && deal.Probability >= 70) ||
      (probabilityFilter === 'medium' && deal.Probability >= 30 && deal.Probability < 70) ||
      (probabilityFilter === 'low' && deal.Probability < 30);
    
    return matchesSearch && matchesStage && matchesProbability;
  });

  // Get unique stages
  const uniqueStages = [...new Set(salesforceDeals.map(deal => deal.StageName))];

  // Calculate totals
  const selectedDealsData = salesforceDeals.filter(deal => selectedDeals.has(deal.Id));
  const totalPipelineValue = selectedDealsData.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
  const totalForecastValue = selectedDealsData.reduce((sum, deal) => sum + ((deal.Amount || 0) * (deal.Probability / 100)), 0);

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
        <h1 className="text-3xl font-bold tracking-tight">Deal Management</h1>
        <p className="text-muted-foreground">
          Select deals from Salesforce to include in your forecast
        </p>
      </div>

      {/* Manager Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Sales Manager
          </CardTitle>
          <CardDescription>
            Choose a sales manager to manage their team's forecast deals
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Summary */}
      {selectedManager && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected Deals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedDeals.size}</div>
              <p className="text-xs text-muted-foreground">
                of {salesforceDeals.length} total deals
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
              <p className="text-xs text-muted-foreground">
                Total deal value
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forecast Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalForecastValue)}</div>
              <p className="text-xs text-muted-foreground">
                Probability-weighted
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Probability</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedDealsData.length > 0 
                  ? Math.round(selectedDealsData.reduce((sum, deal) => sum + deal.Probability, 0) / selectedDealsData.length)
                  : 0
                }%
              </div>
              <p className="text-xs text-muted-foreground">
                Average win probability
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deals Table */}
      {selectedManager && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Team Deals
                </CardTitle>
                <CardDescription>
                  Select deals to include in the forecast
                </CardDescription>
              </div>
              <Button 
                onClick={saveForecastDeals}
                disabled={saving || selectedDeals.size === 0}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Forecast ({selectedDeals.size})
                  </>
                )}
              </Button>
            </div>
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
                <SelectTrigger className="w-[180px]">
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
              <Select value={probabilityFilter} onValueChange={setProbabilityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Probability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Probabilities</SelectItem>
                  <SelectItem value="high">High (70%+)</SelectItem>
                  <SelectItem value="medium">Medium (30-69%)</SelectItem>
                  <SelectItem value="low">Low (&lt;30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredDeals.length > 0 && filteredDeals.every(deal => selectedDeals.has(deal.Id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newSelected = new Set(selectedDeals);
                              filteredDeals.forEach(deal => newSelected.add(deal.Id));
                              setSelectedDeals(newSelected);
                            } else {
                              const newSelected = new Set(selectedDeals);
                              filteredDeals.forEach(deal => newSelected.delete(deal.Id));
                              setSelectedDeals(newSelected);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Deal Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Probability</TableHead>
                      <TableHead>Forecast Value</TableHead>
                      <TableHead>Close Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {salesforceDeals.length === 0 
                            ? 'No deals found. Please select a manager to load deals.'
                            : 'No deals found matching your criteria'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDeals.map((deal) => {
                        const isSelected = selectedDeals.has(deal.Id);
                        const forecastValue = (deal.Amount || 0) * (deal.Probability / 100);
                        
                        return (
                          <TableRow 
                            key={deal.Id}
                            className={isSelected ? 'bg-blue-50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleDealSelection(deal.Id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{deal.Name}</TableCell>
                            <TableCell>{deal.Account?.Name || 'N/A'}</TableCell>
                            <TableCell>{deal.Owner?.Name || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(deal.Amount || 0)}</TableCell>
                            <TableCell>
                              <Badge className={getStageColor(deal.StageName)}>
                                {deal.StageName}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{deal.Probability}%</span>
                                <Progress value={deal.Probability} className="w-16 h-2" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(forecastValue)}
                            </TableCell>
                            <TableCell>{formatDate(deal.CloseDate)}</TableCell>
                          </TableRow>
                        );
                      })
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