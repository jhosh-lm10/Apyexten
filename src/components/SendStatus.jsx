import React from 'react';

const SendStatus = ({ status }) => {
  if (!status.message) return null;

  const getStatusClass = () => {
    if (status.success === true) return 'success';
    if (status.success === false) return 'error';
    return '';
  };

  return (
    <div className={`send-status ${getStatusClass()} fade-in`}>
      {status.message}
    </div>
  );
};

export default SendStatus;