const Input = ({ 
  label, 
  error, 
  className = '',
  helperText,
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-800 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 bg-white border rounded-md text-sm
          ${error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-2 focus:ring-black focus:border-black'
          }
          disabled:bg-gray-50 disabled:text-gray-500
          transition-colors
          ${className}
        `}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
