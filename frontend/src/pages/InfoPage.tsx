import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { reportService, feedbackService } from '../services/api';
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
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  X
} from 'lucide-react';

const InfoPage: React.FC = () => {
  const { t } = useI18n();
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

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleFAQSelect = (faqId: string) => {
    setSelectedFAQ(selectedFAQ === faqId ? null : faqId);
  };

  const handleCustomQuestion = async () => {
    if (customQuestion.trim()) {
      try {
        // Send as feedback with type 'general'
        await feedbackService.create({
          type: 'general',
          rating: 0, // No rating for questions
          content: `Question: ${customQuestion}`,
        });
        setCustomQuestion('');
        alert(t('questionSent'));
      } catch (error) {
        console.error('Error sending question:', error);
        alert('Error sending question. Please try again.');
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
        alert(t('reportSent'));
      } catch (error) {
        console.error('Error sending report:', error);
        alert('Error sending report. Please try again.');
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
        alert(t('feedbackSent'));
      } catch (error) {
        console.error('Error sending feedback:', error);
        alert('Error sending feedback. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">{t('appInfo')}</h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              {t('appDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={() => setChatbotOpen(true)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <MessageCircle className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">{t('askAlex')}</h3>
            <p className="text-gray-600">{t('getHelp')}</p>
          </button>

          <button
            onClick={() => setReportModal(true)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <Flag className="w-8 h-8 text-red-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">{t('reportIssue')}</h3>
            <p className="text-gray-600">{t('reportDescription')}</p>
          </button>

          <button
            onClick={() => setFeedbackModal(true)}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <ThumbsUp className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">{t('giveFeedback')}</h3>
            <p className="text-gray-600">{t('feedbackDescription')}</p>
          </button>
        </div>

        {/* App Capabilities */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('appCapabilities')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <BookOpen className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('easyBooking')}</h3>
              <p className="text-gray-600">{t('bookingCapability')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <MapPin className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('locationBased')}</h3>
              <p className="text-gray-600">{t('locationCapability')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <QrCode className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('qrCheckIn')}</h3>
              <p className="text-gray-600">{t('qrCapability')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Star className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('reviewSystem')}</h3>
              <p className="text-gray-600">{t('reviewCapability')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Shield className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('trustScore')}</h3>
              <p className="text-gray-600">{t('trustCapability')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <Users className="w-8 h-8 text-primary-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{t('teamManagement')}</h3>
              <p className="text-gray-600">{t('teamCapability')}</p>
            </div>
          </div>
        </div>

        {/* Tutorials */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('tutorials')}</h2>
          <div className="space-y-4">
            {[
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
            ].map((tutorial) => (
              <div key={tutorial.id} className="bg-white rounded-lg shadow-md border border-gray-200">
                <button
                  onClick={() => toggleSection(tutorial.id)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-lg">{tutorial.title}</h3>
                  {activeSection === tutorial.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {activeSection === tutorial.id && (
                  <div className="px-6 pb-6">
                    <div className="text-gray-700 whitespace-pre-line">
                      {tutorial.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">{t('troubleshooting')}</h2>
          <div className="space-y-4">
            {[
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
            ].map((issue) => (
              <div key={issue.id} className="bg-white rounded-lg shadow-md border border-gray-200">
                <button
                  onClick={() => toggleSection(issue.id)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-lg">{issue.title}</h3>
                  {activeSection === issue.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {activeSection === issue.id && (
                  <div className="px-6 pb-6">
                    <div className="text-gray-700 whitespace-pre-line">
                      {issue.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alex Chatbot Modal */}
      {chatbotOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">{t('askAlex')}</h3>
              <button
                onClick={() => setChatbotOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">{t('frequentlyAsked')}</h4>
                {faqData.map((faq) => (
                  <div key={faq.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => handleFAQSelect(faq.id)}
                      className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50"
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

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">{t('cantFindAnswer')}</h4>
                <div className="space-y-3">
                  <textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder={t('askCustomQuestion')}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 inline mr-2" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">{t('reportIssue')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reportType')}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'user' | 'business')}
                  className="w-full p-3 border border-gray-300 rounded-lg"
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
                  className="w-full p-3 border border-gray-300 rounded-lg"
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
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setReportModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || !reportDetails.trim()}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">{t('giveFeedback')}</h3>
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
                      className={`w-8 h-8 ${
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
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setFeedbackModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleFeedback}
                  disabled={!feedback.trim() || feedbackRating === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
