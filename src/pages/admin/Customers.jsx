import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import * as profileService from '../../services/profileService.js';
import './AdminPage.css';
import './Customers.css';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState({ loading: true, error: '', customers: [] });

  async function load(term = search) {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const result = await profileService.listCustomers({ search: term });
    setState({ loading: false, error: result.error?.message || '', customers: result.data || [] });
  }

  useEffect(() => {
    load('');
  }, []);

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h1 className="ap-title">Customers</h1>
          <p className="ap-sub">Registered FitTrack customer accounts.</p>
        </div>
      </div>

      <form
        className="ap-card cu-search"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          className="ap-input cu-search__input"
          placeholder="Search by customer name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="cu-search__actions">
          <button className="ap-btn ap-btn--solid" type="submit">
            Search
          </button>
          <button
            className="ap-btn"
            type="button"
            onClick={() => {
              setSearch('');
              load('');
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {state.error && (
        <Alert type="error" title="Could not load customers">
          {state.error}
        </Alert>
      )}

      <section className="ap-card">
        {state.loading ? (
          <Spinner label="Loading customers" />
        ) : state.customers.length === 0 ? (
          <p className="ap-empty">No customers found.</p>
        ) : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account ID</th>
                  <th>Joined</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {state.customers.map((c) => (
                  <tr key={c.id}>
                    <td className="cu-name">{c.full_name || 'Unnamed customer'}</td>
                    <td className="ap-id">{c.id}</td>
                    <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <Link className="ap-link" to={`/admin/customers/${c.id}`}>
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}