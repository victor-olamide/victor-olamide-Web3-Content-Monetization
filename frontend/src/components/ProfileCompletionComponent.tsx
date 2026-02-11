import React, { useState, useEffect } from 'react';
import { Check, X, User, FileText, Heart, MessageSquare, Shield } from 'lucide-react';

interface CompletionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  action?: () => void;
}

interface ProfileCompletionProps {
  profileData?: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    username?: string;
    socialLinks?: any;
    preferences?: any;
    settings?: any;
    totalPurchases?: number;
    rating?: any;
  };
  onUpdate?: () => void;
}

/**
 * Profile Completion Checklist Component
 * Shows users what's needed to complete their profile and unlock features
 */
export const ProfileCompletionComponent: React.FC<ProfileCompletionProps> = ({
  profileData,
  onUpdate
}) => {
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    calculateCompletion();
  }, [profileData]);

  const calculateCompletion = () => {
    const items: CompletionItem[] = [
      {
        id: 'displayName',
        label: 'Add Display Name',
        description: 'Help others recognize you with a display name',
        icon: <User className="w-5 h-5" />,
        isComplete: !!profileData?.displayName,
        action: onUpdate
      },
      {
        id: 'avatar',
        label: 'Upload Avatar',
        description: 'Add a profile picture to personalize your account',
        icon: <User className="w-5 h-5" />,
        isComplete: !!profileData?.avatar,
        action: onUpdate
      },
      {
        id: 'bio',
        label: 'Write Bio',
        description: 'Tell others about yourself',
        icon: <FileText className="w-5 h-5" />,
        isComplete: !!profileData?.bio,
        action: onUpdate
      },
      {
        id: 'username',
        label: 'Choose Username',
        description: 'Create a unique username for your profile',
        icon: <User className="w-5 h-5" />,
        isComplete: !!profileData?.username,
        action: onUpdate
      },
      {
        id: 'socialLinks',
        label: 'Add Social Links',
        description: 'Connect your social media accounts',
        icon: <Heart className="w-5 h-5" />,
        isComplete: !!(
          profileData?.socialLinks &&
          Object.values(profileData.socialLinks).some((v) => !!v)
        ),
        action: onUpdate
      },
      {
        id: 'preferences',
        label: 'Set Preferences',
        description: 'Configure notifications and privacy settings',
        icon: <Shield className="w-5 h-5" />,
        isComplete: !!profileData?.preferences,
        action: onUpdate
      },
      {
        id: 'firstPurchase',
        label: 'Make First Purchase',
        description: 'Start engaging with content',
        icon: <MessageSquare className="w-5 h-5" />,
        isComplete: (profileData?.totalPurchases || 0) > 0,
        action: onUpdate
      },
      {
        id: 'firstRating',
        label: 'Leave First Rating',
        description: 'Share your feedback on purchased content',
        icon: <MessageSquare className="w-5 h-5" />,
        isComplete: !!profileData?.rating,
        action: onUpdate
      }
    ];

    setCompletionItems(items);

    const completedCount = items.filter((item) => item.isComplete).length;
    const percentage = Math.round((completedCount / items.length) * 100);
    setCompletionPercentage(percentage);
  };

  const incompleteItems = completionItems.filter((item) => !item.isComplete);
  const nextRecommendation = incompleteItems[0];

  return (
    <div className="w-full">
      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Profile Completion</h2>
            <p className="text-gray-600 mt-1">
              Complete your profile to unlock all features and build trust
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600">{completionPercentage}%</div>
            <p className="text-gray-600 text-sm">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {completionItems.filter((i) => i.isComplete).length}/{completionItems.length}
            </p>
            <p className="text-gray-600 text-sm">Items Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{incompleteItems.length}</p>
            <p className="text-gray-600 text-sm">Items Remaining</p>
          </div>
        </div>
      </div>

      {/* Next Recommendation */}
      {nextRecommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-1">{nextRecommendation.icon}</div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900">Next Step</p>
              <p className="text-blue-700 text-sm mt-1">{nextRecommendation.description}</p>
            </div>
            {nextRecommendation.action && (
              <button
                onClick={nextRecommendation.action}
                className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition whitespace-nowrap"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion Checklist */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Profile Checklist</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {completionItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start gap-4 ${
                item.isComplete ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="mt-1">
                {item.isComplete ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">{item.icon}</span>
                  <p
                    className={`font-medium ${
                      item.isComplete ? 'text-gray-600 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
              </div>

              {!item.isComplete && item.action && (
                <button
                  onClick={item.action}
                  className="ml-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition whitespace-nowrap flex-shrink-0"
                >
                  Complete
                </button>
              )}

              {item.isComplete && (
                <div className="ml-2 text-green-600 flex-shrink-0">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      {completionPercentage < 100 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-3">Benefits of Completing Your Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Build Trust</p>
                <p className="text-gray-600 text-sm">Increase credibility with other users</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Better Experience</p>
                <p className="text-gray-600 text-sm">Personalized recommendations</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Unlock Features</p>
                <p className="text-gray-600 text-sm">Access premium functionality</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {completionPercentage === 100 && (
        <div className="mt-6 bg-green-50 rounded-lg p-6 border border-green-200 text-center">
          <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-green-900 mb-1">Profile Complete!</h3>
          <p className="text-green-700">
            You've unlocked all features. Your profile is now fully optimized.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileCompletionComponent;
