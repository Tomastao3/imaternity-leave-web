import React from 'react';

const TabHeader = ({ icon, title, subtitle, children }) => {
  return (
    <div className="tab-header">
      <div className="tab-header__text">
        {icon && <span className="tab-header__icon" aria-hidden="true">{icon}</span>}
        <div className="tab-header__titles">
          <h3 className="tab-header__title">{title}</h3>
          {subtitle && <p className="tab-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="tab-header__extra">{children}</div>}
    </div>
  );
};

export default TabHeader;
