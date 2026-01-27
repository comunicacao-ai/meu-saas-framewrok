import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft,
  Mail,
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  Link as LinkIcon,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import './AnnouncementAnalytics.css';

export default function AnnouncementAnalytics() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get(`/emails/stats/${id}`),
        api.get(`/emails/activity/${id}`),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getEventIcon(type) {
    switch (type) {
      case 'open': return <Eye size={16} />;
      case 'click': return <MousePointerClick size={16} />;
      case 'bounce': return <XCircle size={16} />;
      default: return <Mail size={16} />;
    }
  }

  function getEventLabel(type) {
    switch (type) {
      case 'open': return 'Abriu o e-mail';
      case 'click': return 'Clicou em um link';
      case 'bounce': return 'E-mail não entregue';
      case 'complaint': return 'Marcou como spam';
      default: return type;
    }
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="analytics-error">
        <p>Erro ao carregar analytics</p>
        <Link to="/comunicados" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="analytics-header-left">
          <Link to="/comunicados" className="btn btn-ghost btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{stats.announcement.title}</h1>
            <p>{stats.announcement.subject}</p>
          </div>
        </div>
        <div className="analytics-header-right">
          <span className="analytics-date">
            Enviado em {formatDate(stats.announcement.sentAt)}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={loadData}>
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="analytics-cards">
        <div className="analytics-card">
          <div className="analytics-card-icon sent">
            <Users size={24} />
          </div>
          <div className="analytics-card-content">
            <span className="analytics-card-value">{stats.recipients.total}</span>
            <span className="analytics-card-label">Destinatários</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon opens">
            <Eye size={24} />
          </div>
          <div className="analytics-card-content">
            <span className="analytics-card-value">
              {stats.engagement.opens.total}
              <small>{stats.engagement.opens.rate}%</small>
            </span>
            <span className="analytics-card-label">Aberturas</span>
          </div>
          <div className="analytics-card-bar">
            <div
              className="analytics-card-bar-fill opens"
              style={{ width: `${stats.engagement.opens.rate}%` }}
            />
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon clicks">
            <MousePointerClick size={24} />
          </div>
          <div className="analytics-card-content">
            <span className="analytics-card-value">
              {stats.engagement.clicks.total}
              <small>{stats.engagement.clicks.rate}%</small>
            </span>
            <span className="analytics-card-label">Cliques</span>
          </div>
          <div className="analytics-card-bar">
            <div
              className="analytics-card-bar-fill clicks"
              style={{ width: `${stats.engagement.clicks.rate}%` }}
            />
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon ctor">
            <TrendingUp size={24} />
          </div>
          <div className="analytics-card-content">
            <span className="analytics-card-value">
              {stats.engagement.clicks.clickToOpenRate}%
            </span>
            <span className="analytics-card-label">Click-to-Open Rate</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="analytics-grid">
        {/* Top Links */}
        <div className="analytics-section">
          <h2>
            <LinkIcon size={20} />
            Links mais clicados
          </h2>
          {stats.topLinks.length === 0 ? (
            <div className="analytics-empty">
              Nenhum clique registrado ainda
            </div>
          ) : (
            <div className="analytics-links">
              {stats.topLinks.map((link, index) => (
                <div key={link.id} className="analytics-link">
                  <span className="link-rank">#{index + 1}</span>
                  <div className="link-info">
                    <span className="link-url">{link.originalUrl}</span>
                    <span className="link-clicks">{link.clickCount} cliques</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="analytics-section">
          <h2>
            <Clock size={20} />
            Atividade recente
          </h2>
          {activity.length === 0 ? (
            <div className="analytics-empty">
              Nenhuma atividade registrada ainda
            </div>
          ) : (
            <div className="analytics-activity">
              {activity.map((event) => (
                <div key={event.id} className={`activity-item ${event.type}`}>
                  <span className="activity-icon">
                    {getEventIcon(event.type)}
                  </span>
                  <div className="activity-info">
                    <span className="activity-email">{event.recipientEmail}</span>
                    <span className="activity-action">{getEventLabel(event.type)}</span>
                  </div>
                  <span className="activity-time">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Status */}
      <div className="analytics-section full-width">
        <h2>
          <CheckCircle size={20} />
          Status de entrega
        </h2>
        <div className="delivery-stats">
          {Object.entries(stats.recipients.byStatus || {}).map(([status, count]) => (
            <div key={status} className={`delivery-stat ${status}`}>
              <span className="delivery-stat-count">{count}</span>
              <span className="delivery-stat-label">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

