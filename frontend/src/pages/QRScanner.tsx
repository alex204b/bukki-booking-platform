import React from 'react';
import { QRCodeScanner } from '../components/QRCodeScanner';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

export const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleClose = () => {
    navigate(-1);
  };

  const handleSuccess = () => {
    // Optionally refresh data or navigate
    setTimeout(() => {
      navigate(-1);
    }, 2000);
  };

  return (
    <QRCodeScanner onClose={handleClose} onSuccess={handleSuccess} />
  );
};

