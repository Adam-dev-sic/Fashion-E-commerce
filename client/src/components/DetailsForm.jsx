import { ArrowLeft, ChevronRight } from "lucide-react";

export function DetailsForm({
  nextStep,
  prevStep,
  formData,
  handleInputChange,
}) {
  return (
    <form onSubmit={nextStep} className="animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">
            Shipping Information
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              First Name
            </label>
            <input
              required
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Last Name
            </label>
            <input
              required
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Doe"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <input
              required
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              type="email"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="john.doe@example.com"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Street Address
            </label>
            <input
              required
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="123 Main St, Apt 4B"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">City</label>
            <input
              required
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="New York"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              ZIP / Postal Code
            </label>
            <input
              required
              name="zip"
              value={formData.zip}
              onChange={handleInputChange}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="10001"
            />
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2.5 text-slate-600 font-semibold hover:text-slate-900 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            Next Step <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}

export default DetailsForm;
