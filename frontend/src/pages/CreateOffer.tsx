import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { offerService, businessService } from '../services/api';
import { useI18n } from '../contexts/I18nContext';
import { ArrowLeft, Tag, DollarSign, Percent, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
export const CreateOffer: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage' as 'amount' | 'percentage',
    discountAmount: '',
    discountPercentage: '',
    discountCode: '',
    validUntil: '',
    termsAndConditions: '',
    minPurchaseAmount: '',
  });

  // Get user's business
  const { data: business, isLoading: businessLoading } = useQuery(
    'myBusiness',
    async () => {
      const response = await businessService.getMyBusiness();
      return response.data;
    }
  );

  useEffect(() => {
    if (!businessLoading && !business) {
      toast.error('You need to have a business to create offers');
      navigate('/business-dashboard');
    }
  }, [business, businessLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!business) {
      toast.error('Business not found');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter an offer title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter an offer description');
      return;
    }

    if (formData.discountType === 'amount' && !formData.discountAmount) {
      toast.error('Please enter a discount amount');
      return;
    }

    if (formData.discountType === 'percentage' && !formData.discountPercentage) {
      toast.error('Please enter a discount percentage');
      return;
    }

    if (formData.discountType === 'percentage') {
      const percentage = parseFloat(formData.discountPercentage);
      if (percentage < 0 || percentage > 100) {
        toast.error('Discount percentage must be between 0 and 100');
        return;
      }
    }

    setLoading(true);

    try {
      const offerData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        isActive: true,
      };

      if (formData.discountType === 'amount') {
        offerData.discountAmount = parseFloat(formData.discountAmount);
      } else {
        offerData.discountPercentage = parseFloat(formData.discountPercentage);
      }

      if (formData.discountCode.trim()) {
        offerData.discountCode = formData.discountCode.trim();
      }

      if (formData.validUntil) {
        offerData.validUntil = new Date(formData.validUntil).toISOString();
      }

      const metadata: any = {};
      if (formData.minPurchaseAmount) {
        metadata.minPurchaseAmount = parseFloat(formData.minPurchaseAmount);
      }
      if (formData.termsAndConditions.trim()) {
        metadata.termsAndConditions = formData.termsAndConditions.trim();
      }
      if (Object.keys(metadata).length > 0) {
        offerData.metadata = metadata;
      }

      await offerService.create(business.id, offerData);
      toast.success('Offer created and sent to all customers!');
      navigate('/business-dashboard');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.response?.data?.message || 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        <button
          onClick={() => navigate('/business-dashboard')}
          className="btn btn-ghost mb-4 sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="card p-4 sm:p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Create Special Offer
            </h1>
            <p className="text-gray-600">
              This offer will be sent via email and in-app notifications to all customers who have booked with your business.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <strong>Note:</strong> Customer emails are kept private. The system will automatically send the offer to all past customers.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offer Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input input-bordered w-full"
                placeholder="e.g., Summer Sale - 20% Off"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="textarea textarea-bordered w-full"
                rows={4}
                placeholder="Describe your special offer in detail..."
                required
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={formData.discountType === 'percentage'}
                    onChange={(e) => setFormData({ ...formData, discountType: 'percentage' as const })}
                    className="radio radio-primary mr-2"
                  />
                  <Percent className="h-4 w-4 mr-1" />
                  Percentage
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="discountType"
                    value="amount"
                    checked={formData.discountType === 'amount'}
                    onChange={(e) => setFormData({ ...formData, discountType: 'amount' as const })}
                    className="radio radio-primary mr-2"
                  />
                  <DollarSign className="h-4 w-4 mr-1" />
                  Fixed Amount
                </label>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {formData.discountType === 'percentage' ? (
                  <>
                    <input
                      type="number"
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                      className="input input-bordered w-full pr-12"
                      placeholder="20"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </>
                ) : (
                  <>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                      className="input input-bordered w-full pl-8"
                      placeholder="50"
                      min="0"
                      step="0.01"
                      required
                    />
                  </>
                )}
              </div>
            </div>

            {/* Discount Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promo Code (Optional)
              </label>
              <input
                type="text"
                value={formData.discountCode}
                onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                className="input input-bordered w-full font-mono"
                placeholder="SUMMER2024"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                Customers will use this code to redeem the offer
              </p>
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid Until (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="input input-bordered w-full"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Minimum Purchase Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Purchase Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                  className="input input-bordered w-full pl-8"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms and Conditions (Optional)
              </label>
              <textarea
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="e.g., Cannot be combined with other offers. Valid for new bookings only."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/business-dashboard')}
                className="btn btn-ghost flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Tag className="h-4 w-4 mr-2" />
                    Create & Send Offer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

