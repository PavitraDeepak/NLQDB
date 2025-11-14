import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
