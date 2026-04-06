import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Import from './pages/Import';
import Categories from './pages/Categories';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import BoardsList from './pages/BoardsList';
import Board from './pages/Board';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        {/* Home / Welcome screen */}
        <Route path="/" element={<Home />} />

        {/* Accounting routes */}
        <Route path="/accounting" element={<Dashboard />} />
        <Route path="/accounting/transactions" element={<Transactions />} />
        <Route path="/accounting/import" element={<Import />} />
        <Route path="/accounting/categories" element={<Categories />} />
        <Route path="/accounting/invoices" element={<Invoices />} />
        <Route path="/accounting/invoices/new" element={<InvoiceForm />} />
        <Route path="/accounting/invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="/accounting/sales" element={<Sales />} />
        <Route path="/accounting/reports" element={<Reports />} />

        {/* Boards routes */}
        <Route path="/boards" element={<BoardsList />} />
        <Route path="/boards/:id" element={<Board />} />

        {/* Settings routes */}
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
};

export default App;
