import React, { InputHTMLAttributes, ReactNode } from 'react';

interface FormElementProps {
  label?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export const FormElement: React.FC<FormElementProps> = ({
  label,
  required,
  error,
  children,
  className = '',
}) => {
  return (
    <div className={`form-group ${className}`.trim()} style={{ marginBottom: '20px' }}>
      {label && (
        <label
          className="text-uppercase text-muted font-weight-bold d-block"
          style={{ fontSize: '0.75rem', marginBottom: '8px', letterSpacing: '0.5px' }}
        >
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error && (
        <small className="text-danger d-block mt-1" style={{ fontSize: '0.75rem' }}>
          <i className="fa fa-exclamation-circle mr-1"></i> {error}
        </small>
      )}
    </div>
  );
};

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  error?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  icon,
  error,
  className = '',
  style,
  ...props
}) => {
  return (
    <div className="tm-form-element" style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <i
          className={`fa ${icon} tm-form-element-icon`}
          style={{
            position: 'absolute',
            top: '12px',
            left: '15px',
            color: error ? '#dc3545' : '#ee5057',
            fontSize: '1.2rem',
            zIndex: 5,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        ></i>
      )}
      <input
        className={`form-control ${className}`.trim()}
        style={{
          paddingLeft: icon ? '45px' : '15px',
          height: '46px',
          borderRadius: 0,
          border: error ? '1px solid #dc3545' : '1px solid #ccc',
          fontSize: '0.9rem',
          backgroundColor: '#ffffff',
          boxShadow: 'none',
          ...style,
        }}
        {...props}
      />
    </div>
  );
};

export default FormElement;
