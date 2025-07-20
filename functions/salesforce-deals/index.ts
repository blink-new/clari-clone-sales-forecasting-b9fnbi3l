import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
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

interface SalesforceUser {
  Id: string;
  Name: string;
  Email: string;
  Title?: string;
  Department?: string;
}

async function getSalesforceAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
  const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
  const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');
  const username = Deno.env.get('SALESFORCE_USERNAME');
  const password = Deno.env.get('SALESFORCE_PASSWORD');
  const securityToken = Deno.env.get('SALESFORCE_SECURITY_TOKEN');

  if (!clientId || !clientSecret || !username || !password || !securityToken) {
    throw new Error('Missing Salesforce credentials');
  }

  const authUrl = 'https://login.salesforce.com/services/oauth2/token';
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username: username,
    password: password + securityToken,
  });

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce auth failed: ${error}`);
  }

  const authData: SalesforceAuthResponse = await response.json();
  return {
    accessToken: authData.access_token,
    instanceUrl: authData.instance_url,
  };
}

async function getSalesforceData(
  accessToken: string,
  instanceUrl: string,
  query: string
): Promise<any> {
  const url = `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce query failed: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const managerId = url.searchParams.get('managerId');

    // Get Salesforce access token
    const { accessToken, instanceUrl } = await getSalesforceAccessToken();

    let result;

    switch (action) {
      case 'getTeamDeals': {
        if (!managerId) {
          throw new Error('Manager ID is required');
        }

        // First, get team members under this manager
        const teamQuery = `
          SELECT Id, Name, Email, Title, Department 
          FROM User 
          WHERE ManagerId = '${managerId}' 
          AND IsActive = true
        `;
        
        const teamData = await getSalesforceData(accessToken, instanceUrl, teamQuery);
        const teamMembers = teamData.records as SalesforceUser[];
        
        // Get manager's own deals too
        const managerQuery = `
          SELECT Id, Name, Email, Title, Department 
          FROM User 
          WHERE Id = '${managerId}'
        `;
        
        const managerData = await getSalesforceData(accessToken, instanceUrl, managerQuery);
        const allTeamMembers = [...teamMembers, ...managerData.records];
        
        // Get all team member IDs
        const teamMemberIds = allTeamMembers.map(member => `'${member.Id}'`).join(',');
        
        // Get opportunities for all team members
        const dealsQuery = `
          SELECT Id, Name, Amount, CloseDate, StageName, Probability, 
                 AccountId, Account.Name, OwnerId, Owner.Name, Owner.Email,
                 CreatedDate, LastModifiedDate, Type, LeadSource, Description
          FROM Opportunity 
          WHERE OwnerId IN (${teamMemberIds})
          AND IsClosed = false
          ORDER BY CloseDate ASC, Amount DESC
          LIMIT 1000
        `;
        
        const dealsData = await getSalesforceData(accessToken, instanceUrl, dealsQuery);
        
        result = {
          teamMembers: allTeamMembers,
          deals: dealsData.records as SalesforceOpportunity[],
          totalRecords: dealsData.totalSize,
        };
        break;
      }

      case 'getManagers': {
        // Get all users who have direct reports (managers)
        const managersQuery = `
          SELECT DISTINCT Manager.Id, Manager.Name, Manager.Email, Manager.Title
          FROM User 
          WHERE Manager.Id != null 
          AND Manager.IsActive = true
          ORDER BY Manager.Name
        `;
        
        const managersData = await getSalesforceData(accessToken, instanceUrl, managersQuery);
        
        // Remove duplicates and format
        const uniqueManagers = managersData.records.reduce((acc: any[], record: any) => {
          const manager = record.Manager;
          if (!acc.find(m => m.Id === manager.Id)) {
            acc.push(manager);
          }
          return acc;
        }, []);
        
        result = { managers: uniqueManagers };
        break;
      }

      case 'getDealDetails': {
        const dealId = url.searchParams.get('dealId');
        if (!dealId) {
          throw new Error('Deal ID is required');
        }

        const dealQuery = `
          SELECT Id, Name, Amount, CloseDate, StageName, Probability, 
                 AccountId, Account.Name, Account.Type, Account.Industry,
                 OwnerId, Owner.Name, Owner.Email, Owner.Phone,
                 CreatedDate, LastModifiedDate, Type, LeadSource, 
                 Description, NextStep, ForecastCategoryName,
                 (SELECT Id, Name, Quantity, UnitPrice, TotalPrice 
                  FROM OpportunityLineItems)
          FROM Opportunity 
          WHERE Id = '${dealId}'
        `;
        
        const dealData = await getSalesforceData(accessToken, instanceUrl, dealQuery);
        result = { deal: dealData.records[0] };
        break;
      }

      default:
        throw new Error('Invalid action specified');
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Salesforce API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});