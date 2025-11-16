import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  Activity, 
  Database, 
  Users, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [orgData, usageData] = await Promise.all([
        apiService.getCurrentOrganization(),
        apiService.getUsageSummary()
      ]);
      setOrganization(orgData);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (current, limit) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-black';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const queryPercentage = getUsagePercentage(
    usage?.queriesThisMonth || 0, 
    organization?.limits?.queriesPerMonth
  );
  
  const tokenPercentage = getUsagePercentage(
    usage?.tokensUsed || 0,
    organization?.limits?.tokensPerMonth
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Overview of your organization's usage and activity
          </p>
        </div>

        {/* Alert if approaching limits */}
        {(queryPercentage > 80 || tokenPercentage > 80) && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-yellow-900">
                Approaching usage limits
              </p>
              <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                You're using {Math.round(Math.max(queryPercentage, tokenPercentage))}% of your plan limits.
                Consider upgrading to avoid service interruption.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 sm:mt-3"
                onClick={() => navigate('/billing')}
              >
                Upgrade Plan
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Queries Metric */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Queries This Month</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 sm:mt-2">
                  {usage?.queriesThisMonth?.toLocaleString() || 0}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  of {organization?.limits?.queriesPerMonth?.toLocaleString() || '∞'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 sm:mt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getUsageColor(queryPercentage)}`}
                  style={{ width: `${queryPercentage}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Tokens Metric */}
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500">Tokens Used</p>
                <p className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 sm:mt-2">
                  {(usage?.tokensUsed || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  of {organization?.limits?.tokensPerMonth?.toLocaleString() || '∞'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getUsageColor(tokenPercentage)}`}
                  style={{ width: `${tokenPercentage}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Team Members */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Team Members</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  {organization?.teamMemberCount || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  of {organization?.limits?.maxTeamMembers || '∞'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full justify-center"
              onClick={() => navigate('/organization')}
            >
              Manage Team
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </Card>
        </div>

        {/* Plan Info */}
        <div className="grid grid-cols-2 gap-6">
          <Card title="Current Plan" description="Your subscription details">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {organization?.plan || 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`
                  text-sm font-medium px-2 py-1 rounded-md
                  ${organization?.planStatus === 'active' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-gray-50 text-gray-700'
                  }
                `}>
                  {organization?.planStatus || 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Billing Period</span>
                <span className="text-sm font-medium text-gray-900">Monthly</span>
              </div>
              <Button
                variant="primary"
                className="w-full mt-4"
                onClick={() => navigate('/billing')}
              >
                Manage Billing
              </Button>
            </div>
          </Card>

          <Card title="Quick Actions" description="Common tasks and shortcuts">
            <div className="space-y-2">
              <button
                onClick={() => navigate('/chat')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Query Database</p>
                  <p className="text-xs text-gray-500">Ask questions in natural language</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/tables')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Browse Tables</p>
                  <p className="text-xs text-gray-500">Explore your database schema</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/api-keys')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Activity className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">API Keys</p>
                  <p className="text-xs text-gray-500">Manage API access</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
