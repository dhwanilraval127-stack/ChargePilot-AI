import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import Button from '../components/Button';
import { adminAPI } from '../services/api';
import {
  Users, Building2, AlertCircle, CheckCircle,
  Shield, TrendingUp, FileText, XCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsData, claimsData, reportsData] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getPendingClaims(),
        adminAPI.getReports()
      ]);
      setStats(statsData);
      setPendingClaims(claimsData);
      setReports(reportsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (claimId, status, comment = '') => {
    try {
      await adminAPI.updateClaim(claimId, { status, adminComment: comment });
      loadAdminData();
      alert(`Claim ${status.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Failed to update claim:', error);
      alert('Failed to update claim');
    }
  };

  const handleReport = async (reportId, status) => {
    try {
      await adminAPI.updateReport(reportId, status);
      loadAdminData();
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
        <p className="text-gray-600 mt-1">Platform management and oversight</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.totalUsers')}</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <Users className="w-12 h-12 text-primary-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.totalOwners')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {stats?.totalOwners || 0}
              </p>
            </div>
            <Shield className="w-12 h-12 text-purple-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.totalStations')}</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stats?.totalStations || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.verifiedStations || 0} verified
              </p>
            </div>
            <Building2 className="w-12 h-12 text-blue-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trips</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats?.totalTrips || 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'claims'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Claims ({pendingClaims.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Reports ({reports.length})
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Recent Activity">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-gray-600">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <FileText className="text-blue-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Trip planned</p>
                  <p className="text-xs text-gray-600">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <AlertCircle className="text-orange-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium">New station claim</p>
                  <p className="text-xs text-gray-600">1 hour ago</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="System Health">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Station Verification Rate</span>
                  <span className="font-medium">
                    {stats?.totalStations > 0
                      ? ((stats.verifiedStations / stats.totalStations) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${stats?.totalStations > 0
                        ? (stats.verifiedStations / stats.totalStations) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pending Claims</span>
                  <span className="font-medium">{pendingClaims.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${Math.min(pendingClaims.length * 10, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Open Reports</span>
                  <span className="font-medium">{reports.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${Math.min(reports.length * 10, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <Card title={t('admin.pendingClaims')}>
          <div className="space-y-4">
            {pendingClaims.map((claim) => (
              <div key={claim.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{claim.station_name}</h3>
                    <p className="text-sm text-gray-600">{claim.station_address}</p>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
                    Pending
                  </span>
                </div>

                <div className="mb-3 text-sm">
                  <p><strong>Owner:</strong> {claim.owner_name}</p>
                  <p><strong>Email:</strong> {claim.owner_email}</p>
                  <p><strong>Submitted:</strong> {new Date(claim.created_at).toLocaleDateString()}</p>
                </div>

                {claim.business_proof && (
                  <div className="mb-3">
                    <a
                      href={`http://localhost:5000/${claim.business_proof}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-sm"
                    >
                      View Business Proof →
                    </a>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleClaim(claim.id, 'APPROVED', 'Claim approved')}
                  >
                    <CheckCircle size={16} />
                    {t('admin.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleClaim(claim.id, 'REJECTED', 'Insufficient proof')}
                  >
                    <XCircle size={16} />
                    {t('admin.reject')}
                  </Button>
                </div>
              </div>
            ))}

            {pendingClaims.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle size={48} className="mx-auto mb-4" />
                <p>No pending claims</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Card title={t('admin.reports')}>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{report.station_name}</h3>
                    <p className="text-sm text-gray-600">Issue: {report.issue_type}</p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                    Open
                  </span>
                </div>

                <p className="text-sm mb-3">{report.description}</p>

                <div className="text-xs text-gray-500 mb-3">
                  Reported by {report.reporter_name} on{' '}
                  {new Date(report.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleReport(report.id, 'RESOLVED')}
                  >
                    {t('admin.resolve')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReport(report.id, 'DISMISSED')}
                  >
                    {t('admin.dismiss')}
                  </Button>
                </div>
              </div>
            ))}

            {reports.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <AlertCircle size={48} className="mx-auto mb-4" />
                <p>No open reports</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;