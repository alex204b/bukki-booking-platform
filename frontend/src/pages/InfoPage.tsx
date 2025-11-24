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
  HelpCircle,
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
    <div className="space-y-0 w-full overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-6 sm:p-8 md:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl rounded-xl sm:rounded-2xl md:rounded-3xl mx-2 sm:mx-4 lg:mx-6">
        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 opacity-20 animate-pulse">
          <HelpCircle size={120} strokeWidth={6} color="white" className="hidden sm:block" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            {t('appInfo')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-primary-50 max-w-3xl">
            {t('appDescription')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6 px-4 sm:px-6 lg:px-6 py-6 sm:py-8">
        <button
          onClick={() => setChatbotOpen(true)}
          className="card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 transition-colors">{t('askAlex')}</h3>
          <p className="text-sm sm:text-base text-gray-600">{t('getHelp')}</p>
        </button>

        <button
          onClick={() => setReportModal(true)}
          className="card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-3 bg-gradient-to-br from-red-100 to-red-50 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <Flag className="h-6 w-6 sm:h-7 sm:w-7 text-red-600" />
          </div>
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 transition-colors">{t('reportIssue')}</h3>
          <p className="text-sm sm:text-base text-gray-600">{t('reportDescription')}</p>
        </button>

        <button
          onClick={() => setFeedbackModal(true)}
          className="card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
        >
          <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
            <ThumbsUp className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
          </div>
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 transition-colors">{t('giveFeedback')}</h3>
          <p className="text-sm sm:text-base text-gray-600">{t('feedbackDescription')}</p>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 sm:px-6 lg:px-6">
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-primary-600'
            }`}
          >
            {t('overview') || 'Overview'}
          </button>
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'tutorials'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-primary-600'
            }`}
          >
            {t('tutorials')}
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'faq'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-primary-600'
            }`}
          >
            {t('frequentlyAsked') || 'FAQ'}
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === 'help'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-primary-600'
            }`}
          >
            {t('troubleshooting') || 'Help'}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-6 pb-6 sm:pb-8 md:pb-10">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('appCapabilities')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {capabilities.map((capability, index) => (
                  <div 
                    key={capability.title}
                    className="card p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 bg-white group"
                  >
                    <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                      <capability.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 group-hover:text-primary-600 transition-colors">{capability.title}</h3>
                    <p className="text-sm sm:text-base text-gray-600">{capability.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('tutorials')}</h2>
            {tutorials.map((tutorial) => (
              <div key={tutorial.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(tutorial.id)}
                  className="w-full p-5 sm:p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-bold text-lg sm:text-xl">{tutorial.title}</h3>
                  {activeSection === tutorial.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {activeSection === tutorial.id && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="text-gray-700 whitespace-pre-line leading-relaxed">
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
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('frequentlyAsked') || 'Frequently Asked Questions'}</h2>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchFAQs')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="space-y-4">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => {
                  const isExpanded = selectedFAQ === faq.id;
                  return (
                    <div key={faq.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleFAQSelect(faq.id)}
                        className="w-full p-5 sm:p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-base sm:text-lg pr-4">{faq.question}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                          <div className="text-gray-700 leading-relaxed">
                            {faq.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">{t('noResultsFound') || `No FAQs found matching "${searchQuery}"`}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help/Troubleshooting Tab */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('troubleshooting')}</h2>
            {troubleshooting.map((issue) => (
              <div key={issue.id} className="card border border-gray-200 bg-white rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(issue.id)}
                  className="w-full p-5 sm:p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-bold text-lg sm:text-xl">{issue.title}</h3>
                  {activeSection === issue.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {activeSection === issue.id && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="text-gray-700 whitespace-pre-line leading-relaxed">
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
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold">{t('askAlex')}</h3>
              <button
                onClick={() => setChatbotOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-gray-900">{t('frequentlyAsked')}</h4>
                {faqData.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleFAQSelect(faq.id)}
                      className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium">{faq.question}</span>
                      {selectedFAQ === faq.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {selectedFAQ === faq.id && (
                      <div className="px-4 pb-4">
                        <div className="text-gray-700 text-sm">
                          {faq.answer}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">{t('cantFindAnswer')}</h4>
                <div className="space-y-3">
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder={t('askCustomQuestion')}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                  />
                  <button
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
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
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold">{t('reportIssue')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reportType')}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'user' | 'business')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="user">{t('reportUser')}</option>
                  <option value="business">{t('reportBusiness')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reportReason')}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reportDetails')}
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder={t('describeIssue')}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setReportModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || !reportDetails.trim()}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold">{t('giveFeedback')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('ratingInfo')}
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`w-8 h-8 transition-colors ${
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedbackInfo')}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t('shareYourThoughts')}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setFeedbackModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleFeedback}
                  disabled={!feedback.trim() || feedbackRating === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('submitFeedback')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoPage;
