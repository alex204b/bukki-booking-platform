import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { reportService, feedbackService } from '../services/api';
import toast from 'react-hot-toast';
import { 
  BookOpen, 
  Users, 
  MapPin, 
  QrCode, 
  Star, 
  Shield, 
  MessageCircle, 
  Flag, 
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Send,
  X,
  Search,
  FileText,
  Settings,
  ArrowRight,
  Home
} from 'lucide-react';

const InfoPage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'tutorials' | 'faq' | 'help'>('overview');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [reportModal, setReportModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [reportType, setReportType] = useState<'user' | 'business'>('user');
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const faqData = [
    {
      id: 'booking',
      question: t('howToBook'),
      answer: t('bookingTutorial')
    },
    {
      id: 'qr',
      question: t('howToUseQR'),
      answer: t('qrTutorial')
    },
    {
      id: 'business',
      question: t('howToCreateBusiness'),
      answer: t('businessTutorial')
    },
    {
      id: 'reviews',
      question: t('howToReview'),
      answer: t('reviewTutorial')
    },
    {
      id: 'trust',
      question: t('whatIsTrustScore'),
      answer: t('trustScoreTutorial')
    },
    {
      id: 'team',
      question: t('howToInviteTeam'),
      answer: t('teamTutorial')
    }
  ];

  const tutorials = [
    {
      id: 'getting-started',
      title: t('gettingStarted'),
      content: t('gettingStartedContent')
    },
    {
      id: 'booking-tutorial',
      title: t('bookingTutorialTitle'),
      content: t('bookingTutorialContent')
    },
    {
      id: 'business-setup',
      title: t('businessSetupTutorial'),
      content: t('businessSetupContent')
    },
    {
      id: 'qr-system',
      title: t('qrSystemTutorial'),
      content: t('qrSystemContent')
    }
  ];

  const troubleshooting = [
    {
      id: 'email-issues',
      title: t('emailNotReceived'),
      content: t('emailTroubleshooting')
    },
    {
      id: 'qr-issues',
      title: t('qrNotWorking'),
      content: t('qrTroubleshooting')
    },
    {
      id: 'location-issues',
      title: t('locationNotWorking'),
      content: t('locationTroubleshooting')
    },
    {
      id: 'booking-issues',
      title: t('bookingProblems'),
      content: t('bookingTroubleshooting')
    }
  ];

  const filteredFAQs = faqData.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleFAQSelect = (faqId: string) => {
    setSelectedFAQ(selectedFAQ === faqId ? null : faqId);
  };

  const handleCustomQuestion = async () => {
    if (customQuestion.trim()) {
      try {
        await feedbackService.create({
          type: 'general',
          rating: 0,
          content: `Question: ${customQuestion}`,
        });
        setCustomQuestion('');
        toast.success(t('questionSent'));
        setChatbotOpen(false);
      } catch (error) {
        console.error('Error sending question:', error);
        toast.error('Error sending question. Please try again.');
      }
    }
  };

  const handleReport = async () => {
    if (reportReason && reportDetails) {
      try {
        await reportService.create({
          type: reportType,
          reason: reportReason as any,
          details: reportDetails,
        });
        setReportModal(false);
        setReportReason('');
        setReportDetails('');
        toast.success(t('reportSent'));
      } catch (error) {
        console.error('Error sending report:', error);
        toast.error('Error sending report. Please try again.');
      }
    }
  };

  const handleFeedback = async () => {
    if (feedback && feedbackRating > 0) {
      try {
        await feedbackService.create({
          type: 'general',
          rating: feedbackRating,
          content: feedback,
        });
        setFeedbackModal(false);
        setFeedback('');
        setFeedbackRating(0);
        toast.success(t('feedbackSent'));
      } catch (error) {
        console.error('Error sending feedback:', error);
        toast.error('Error sending feedback. Please try again.');
      }
    }
  };

  const capabilities = [
    {
      icon: BookOpen,
      title: t('easyBooking'),
      description: t('bookingCapability')
    },
    {
      icon: MapPin,
      title: t('locationBased'),
      description: t('locationCapability')
    },
    {
      icon: QrCode,
      title: t('qrCheckIn'),
      description: t('qrCapability')
    },
    {
      icon: Star,
      title: t('reviewSystem'),
      description: t('reviewCapability')
    },
    {
      icon: Shield,
      title: t('trustScore'),
      description: t('trustCapability')
    },
    {
      icon: Users,
      title: t('teamManagement'),
      description: t('teamCapability')
    }
  ];

  return (
    <>
      <div className="space-y-0 w-full pt-4">
      {/* Hero Section */}
      <div className="bg-[#330007] p-4 sm:p-5 md:p-6 text-white relative overflow-hidden shadow-2xl rounded-xl sm:rounded-2xl md:rounded-3xl mx-2 sm:mx-4 lg:mx-6">
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
            {t('appInfo')}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-100 max-w-3xl">
            {t('appDescription')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-3 sm:px-4 py-4 sm:py-6">
        <button
          onClick={() => setChatbotOpen(true)}
          className="card p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <MessageCircle className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-base mb-1.5 group-hover:text-[#E7001E] transition-colors">{t('askAlex')}</h3>
          <p className="text-xs sm:text-sm text-gray-600">{t('getHelp')}</p>
        </button>

        <button
          onClick={() => setReportModal(true)}
          className="card p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-2 bg-gradient-to-br from-red-100 to-red-50 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <Flag className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="font-bold text-base mb-1.5 group-hover:text-[#E7001E] transition-colors">{t('reportIssue')}</h3>
          <p className="text-xs sm:text-sm text-gray-600">{t('reportDescription')}</p>
        </button>

        <button
          onClick={() => setFeedbackModal(true)}
          className="card p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
            <ThumbsUp className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="font-bold text-base mb-1.5 group-hover:text-[#E7001E] transition-colors">{t('giveFeedback')}</h3>
          <p className="text-xs sm:text-sm text-gray-600">{t('feedbackDescription')}</p>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="px-3 sm:px-4">
        <div className="flex flex-wrap gap-1.5 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-[#E7001E] text-[#E7001E]'
                : 'border-transparent text-gray-600 hover:text-[#E7001E]'
            }`}
          >
            {t('overview') || 'Overview'}
          </button>
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'tutorials'
                ? 'border-[#E7001E] text-[#E7001E]'
                : 'border-transparent text-gray-600 hover:text-[#E7001E]'
            }`}
          >
            {t('tutorials')}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'faq'
                ? 'border-[#E7001E] text-[#E7001E]'
                : 'border-transparent text-gray-600 hover:text-[#E7001E]'
            }`}
          >
            {t('frequentlyAsked') || 'FAQ'}
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'help'
                ? 'border-[#E7001E] text-[#E7001E]'
                : 'border-transparent text-gray-600 hover:text-[#E7001E]'
            }`}
          >
            {t('troubleshooting') || 'Help'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-3 sm:px-4 pb-4 sm:pb-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{t('appCapabilities')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {capabilities.map((capability, index) => (
                  <div
                    key={capability.title}
                    className="card p-3 sm:p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
                  >
                    <div className="p-2 bg-gradient-to-br from-[#330007] to-[#220005] rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform">
                      <capability.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold text-base mb-1.5 group-hover:text-[#E7001E] transition-colors">{capability.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{capability.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{t('tutorials')}</h2>
            {tutorials.map((tutorial) => (
              <div key={tutorial.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(tutorial.id)}
                  className="w-full p-3 sm:p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-bold text-base sm:text-lg">{tutorial.title}</h3>
                  {activeSection === tutorial.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {activeSection === tutorial.id && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                      {tutorial.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{t('frequentlyAsked') || 'Frequently Asked Questions'}</h2>
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchFAQs')}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => {
                  const isExpanded = selectedFAQ === faq.id;
                  return (
                    <div key={faq.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleFAQSelect(faq.id)}
                        className="w-full p-3 sm:p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-sm sm:text-base pr-3">{faq.question}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                          <div className="text-gray-700 text-sm leading-relaxed">
                            {faq.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">{t('noResultsFound') || `No FAQs found matching "${searchQuery}"`}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help/Troubleshooting Tab */}
        {activeTab === 'help' && (
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">{t('troubleshooting')}</h2>
            {troubleshooting.map((issue) => (
              <div key={issue.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(issue.id)}
                  className="w-full p-3 sm:p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-bold text-base sm:text-lg">{issue.title}</h3>
                  {activeSection === issue.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {activeSection === issue.id && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                      {issue.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alex Chatbot Modal */}
      {chatbotOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">{t('askAlex')}</h3>
              <button
                onClick={() => setChatbotOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-3 mb-4">
                <h4 className="font-semibold text-sm text-gray-900">{t('frequentlyAsked')}</h4>
                {faqData.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleFAQSelect(faq.id)}
                      className="w-full p-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-sm">{faq.question}</span>
                      {selectedFAQ === faq.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {selectedFAQ === faq.id && (
                      <div className="px-3 pb-3">
                        <div className="text-gray-700 text-xs">
                          {faq.answer}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">{t('cantFindAnswer')}</h4>
                <div className="space-y-2">
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder={t('askCustomQuestion')}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                    rows={3}
                  />
                  <button
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    style={{ backgroundColor: !customQuestion.trim() ? undefined : '#E7001E' }}
                    className="w-full text-white text-sm py-1.5 px-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 transition-opacity flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {t('sendQuestion')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">{t('reportIssue')}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('reportType')}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'user' | 'business')}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                >
                  <option value="user">{t('reportUser')}</option>
                  <option value="business">{t('reportBusiness')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('reportReason')}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                >
                  <option value="">{t('selectReason')}</option>
                  <option value="no-show">{t('noShow')}</option>
                  <option value="false-info">{t('falseInformation')}</option>
                  <option value="inappropriate">{t('inappropriateBehavior')}</option>
                  <option value="spam">{t('spam')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('reportDetails')}
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder={t('describeIssue')}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setReportModal(false)}
                  className="flex-1 text-sm py-1.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || !reportDetails.trim()}
                  className="flex-1 text-sm bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('submitReport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">{t('giveFeedback')}</h3>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('ratingInfo')}
                </label>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`w-7 h-7 transition-colors ${
                        star <= feedbackRating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      <Star className="w-full h-full fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('feedbackInfo')}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t('shareYourThoughts')}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E]"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setFeedbackModal(false)}
                  className="flex-1 text-sm py-1.5 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleFeedback}
                  disabled={!feedback.trim() || feedbackRating === 0}
                  style={{ backgroundColor: (!feedback.trim() || feedbackRating === 0) ? undefined : '#E7001E' }}
                  className="flex-1 text-sm text-white py-1.5 px-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-opacity"
                >
                  {t('submitFeedback')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Footer - Outside main container for full width */}
      <footer className="bg-gradient-to-br from-[#330007] via-[#220005] to-[#110003] text-white mt-8" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
        <div className="py-8 px-3 sm:px-4 lg:px-6">
          <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* About Section */}
            <div>
              <h3 className="text-lg font-bold mb-3">BUKKi</h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                {t('bukkiDescription') || 'Your trusted platform for booking local services. Connect with businesses, manage appointments, and enjoy seamless experiences.'}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-3">{t('quickLinks') || 'Quick Links'}</h3>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors text-xs">
                    {t('home')}
                  </Link>
                </li>
                <li>
                  <Link to="/businesses" className="text-gray-300 hover:text-white transition-colors text-xs">
                    {t('browseBusinesses')}
                  </Link>
                </li>
                <li>
                  <Link to="/my-bookings" className="text-gray-300 hover:text-white transition-colors text-xs">
                    {t('myBookings')}
                  </Link>
                </li>
                <li>
                  <Link to="/info" className="text-gray-300 hover:text-white transition-colors text-xs">
                    {t('appInfo')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact & Support */}
            <div>
              <h3 className="text-lg font-bold mb-3">{t('contactSupport') || 'Contact & Support'}</h3>
              <ul className="space-y-1.5 text-xs text-gray-300">
                <li>
                  <strong>{t('email')}:</strong> support@bukki.com
                </li>
                <li>
                  <strong>{t('phone')}:</strong> +373 XXX XXX XX
                </li>
                <li>
                  <strong>{t('version')}:</strong> 1.0.0
                </li>
                <li className="pt-1.5">
                  <Link to="/terms" className="hover:text-white transition-colors">
                    {t('termsOfServiceTitle')}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    {t('privacyPolicyTitle')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/20 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <p className="text-xs text-gray-300 text-center md:text-left">
                {t('Made With Love') || '© 2026 BUKKi. Made with ❤️ for connecting local businesses with their customers'}
              </p>
              <div className="flex gap-3">
                {/* Social Media Icons - Placeholder */}
                <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="Twitter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default InfoPage;
