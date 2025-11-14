import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useState } from 'react';
import { Check, AlertCircle, Info, XCircle } from 'lucide-react';

const StyleGuide = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Design System - Supabase White Theme
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Component showcase and design patterns
          </p>
        </div>

        {/* Color Palette */}
        <Card title="Color Palette" className="mb-6">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <div className="h-20 bg-white border border-gray-200 rounded-lg mb-2"></div>
              <p className="text-xs text-gray-600">#ffffff</p>
              <p className="text-xs text-gray-500">Background</p>
            </div>
            <div>
              <div className="h-20 bg-gray-50 border border-gray-200 rounded-lg mb-2"></div>
              <p className="text-xs text-gray-600">#f9fafb</p>
              <p className="text-xs text-gray-500">Surface</p>
            </div>
            <div>
              <div className="h-20 bg-gray-900 rounded-lg mb-2"></div>
              <p className="text-xs text-gray-600">#1e1e1e</p>
              <p className="text-xs text-gray-500">Primary Text</p>
            </div>
            <div>
              <div className="h-20 bg-gray-600 rounded-lg mb-2"></div>
              <p className="text-xs text-gray-600">#6b7280</p>
              <p className="text-xs text-gray-500">Secondary Text</p>
            </div>
            <div>
              <div className="h-20 bg-black rounded-lg mb-2"></div>
              <p className="text-xs text-gray-600">#000000</p>
              <p className="text-xs text-gray-500">Primary Action</p>
            </div>
          </div>
        </Card>

        {/* Typography */}
        <Card title="Typography" className="mb-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Page Title (text-2xl font-semibold)
              </h1>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Section Title (text-lg font-medium)
              </h2>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                Subtitle or description text (text-sm text-gray-500)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700 leading-6">
                Body text with proper line height and readability (text-sm text-gray-700 leading-6)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-800">
                Form Label (text-sm font-medium text-gray-800)
              </label>
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <Card title="Buttons" className="mb-6">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" disabled>Disabled Button</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
        </Card>

        {/* Inputs */}
        <Card title="Form Inputs" className="mb-6">
          <div className="space-y-4 max-w-md">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              helperText="We'll never share your email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
            />
            <Input
              label="With Error"
              type="text"
              error="This field is required"
              placeholder="Enter value..."
            />
            <Input
              label="Disabled"
              type="text"
              disabled
              value="Disabled input"
            />
          </div>
        </Card>

        {/* Status Badges */}
        <Card title="Status Badges" className="mb-6">
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-green-50 text-green-700">
              Active
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-yellow-50 text-yellow-700">
              Pending
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-red-50 text-red-700">
              Failed
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-gray-50 text-gray-700">
              Inactive
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-700">
              Info
            </span>
          </div>
        </Card>

        {/* Alert Boxes */}
        <Card title="Alert Boxes" className="mb-6">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Information</p>
                <p className="text-sm text-gray-700 mt-1">
                  This is an informational message with helpful context.
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Success</p>
                <p className="text-sm text-green-700 mt-1">
                  Your changes have been saved successfully.
                </p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Warning</p>
                <p className="text-sm text-yellow-700 mt-1">
                  You're approaching your plan limits. Consider upgrading.
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">
                  There was an error processing your request. Please try again.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card title="Data Table" className="mb-6">
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              {
                key: 'status',
                label: 'Status',
                render: (value) => (
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    value === 'active' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {value}
                  </span>
                ),
              },
            ]}
            data={[
              { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
              { name: 'Jane Smith', email: 'jane@example.com', role: 'Member', status: 'active' },
              { name: 'Bob Wilson', email: 'bob@example.com', role: 'Member', status: 'inactive' },
            ]}
          />
        </Card>

        {/* Modal Trigger */}
        <Card title="Modal" className="mb-6">
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Open Modal
          </Button>
        </Card>

        {/* Chat Message Bubbles */}
        <Card title="Chat Message Bubbles" className="mb-6">
          <div className="space-y-4 max-w-2xl">
            <div className="flex justify-end">
              <div className="bg-black text-white rounded-lg px-4 py-3 max-w-md">
                <p className="text-sm leading-6">
                  Show me all customers from New York with orders over $1000
                </p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3 max-w-md">
                <p className="text-sm leading-6">
                  I found 23 customers matching your criteria. Here are the results...
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Metric Cards */}
        <Card title="Dashboard Metric Cards" className="mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Queries</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-2">1,234</p>
                  <p className="text-sm text-gray-500 mt-1">+12% from last month</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Check className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-2">98.5%</p>
                  <p className="text-sm text-gray-500 mt-1">Excellent</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">API Calls</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-2">5,678</p>
                  <p className="text-sm text-gray-500 mt-1">of 10,000</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Info className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-black transition-all" style={{ width: '56%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Design Principles */}
        <Card title="Design Principles" className="mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">✅ DO</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use clean white backgrounds</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Apply subtle gray surfaces for depth</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Keep borders minimal (border-gray-200)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use big, breathable spacing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Maintain consistent typography</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">❌ DON'T</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Add neon colors or gradients</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Use heavy shadows</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Create cluttered layouts</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Use rounded-pill buttons</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Mix different design patterns</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal Example */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Example Modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowModal(false)}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This is a modal dialog following the Supabase white theme design system.
          </p>
          <Input label="Example Input" placeholder="Enter something..." />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default StyleGuide;
