const CartItem = ({ item }) => {
 
  return (
    <div className="flex items-start sm:items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-medium text-slate-900 truncate">
          {item.name}
        </h4>
        <p className="text-md text-slate-600 mt-1">Size: {(item.size).toUpperCase()}</p>
        <div className="mt-2 text-sm font-medium text-slate-900">
          $
          {item.discount && item.discount > 0
            ? (item.price * (1 - item.discount / 100) * item.quantity).toFixed(
                2
              )
            : (item.price * item.quantity).toFixed(2)}
        </div>
      </div>
      <div className="text-sm text-slate-500 ">Qty: {(item.quantity)}</div>
    </div>
  );
};

export default CartItem;
