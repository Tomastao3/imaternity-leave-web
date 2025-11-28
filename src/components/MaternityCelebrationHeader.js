import React from 'react';

const MaternityCelebrationHeader = ({ onLogout }) => {
  return (
    <div className="maternity-celebration-header">
      {onLogout && (
        <div className="maternity-celebration-header__actions">
          <a
            href="#logout"
            className="maternity-celebration-header__logout"
            onClick={event => {
              event.preventDefault();
              onLogout();
            }}
          >
            退出
          </a>
        </div>
      )}
      <div className="maternity-celebration-header__content">
        <h2 className="maternity-celebration-header__title">喜迎新生命 · 产假津贴安心算</h2>
      </div>
      <div className="maternity-celebration-header__decor" aria-hidden="true">
        <span className="decor-bubble decor-bubble--primary" />
        <span className="decor-bubble decor-bubble--secondary" />
        <span className="decor-bubble decor-bubble--tertiary" />
      </div>
    </div>
  );
};

export default MaternityCelebrationHeader;
