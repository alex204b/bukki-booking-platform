import React from 'react';
import { useScreenSize } from '../hooks/useScreenSize';
import { usePlatform } from '../hooks/usePlatform';

/**
 * Example component demonstrating different responsive design approaches
 * You can copy these patterns to your actual pages
 */
const ResponsiveExample: React.FC = () => {
  const { isMobile, isTablet, isDesktop, screenSize } = useScreenSize();
  const { isNative, isWeb, isAndroid, isIOS } = usePlatform();

  return (
    <div className="p-4">
      {/* Approach 1: Using Tailwind Breakpoints */}
      <div className="
        bg-blue-500      // mobile: blue
        md:bg-green-500  // tablet: green
        lg:bg-red-500    // desktop: red
        p-4 text-white rounded mb-4
      ">
        <h2 className="text-sm md:text-base lg:text-xl font-bold">
          Approach 1: Tailwind Responsive Classes
        </h2>
        <p className="text-xs md:text-sm lg:text-base">
          This div changes color and text size based on screen width
        </p>
      </div>

      {/* Approach 2: Hide/Show Different Layouts */}
      <div className="mb-4">
        <h2 className="font-bold mb-2">Approach 2: Conditional Rendering</h2>

        {/* Mobile Layout */}
        <div className="block md:hidden bg-purple-100 p-4 rounded">
          <h3 className="font-semibold">Mobile Layout</h3>
          <div className="space-y-2 mt-2">
            <div className="bg-white p-2 rounded">Item 1</div>
            <div className="bg-white p-2 rounded">Item 2</div>
            <div className="bg-white p-2 rounded">Item 3</div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex gap-4 bg-blue-100 p-4 rounded">
          <div className="flex-1 bg-white p-4 rounded">
            <h3 className="font-semibold">Desktop Layout - Column 1</h3>
          </div>
          <div className="flex-1 bg-white p-4 rounded">
            <h3 className="font-semibold">Desktop Layout - Column 2</h3>
          </div>
          <div className="flex-1 bg-white p-4 rounded">
            <h3 className="font-semibold">Desktop Layout - Column 3</h3>
          </div>
        </div>
      </div>

      {/* Approach 3: Using JavaScript Hook */}
      <div className="mb-4 bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Approach 3: useScreenSize Hook</h2>
        {isMobile && (
          <div className="bg-yellow-200 p-2 rounded">
            📱 Mobile View (JavaScript detected)
          </div>
        )}
        {isTablet && (
          <div className="bg-green-200 p-2 rounded">
            📱 Tablet View (JavaScript detected)
          </div>
        )}
        {isDesktop && (
          <div className="bg-blue-200 p-2 rounded">
            💻 Desktop View (JavaScript detected)
          </div>
        )}
        <p className="text-sm mt-2">Screen Size: {screenSize}</p>
      </div>

      {/* Approach 4: Platform Detection */}
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Approach 4: Platform Detection</h2>
        {isNative ? (
          <div className="bg-green-200 p-2 rounded mb-2">
            📱 Running as Native App
            {isAndroid && ' - Android'}
            {isIOS && ' - iOS'}
          </div>
        ) : (
          <div className="bg-orange-200 p-2 rounded mb-2">
            🌐 Running in Web Browser
          </div>
        )}

        {/* Example: Different UI for Native vs Web */}
        {isNative ? (
          <button className="w-full bg-[#E7001E] text-white py-3 rounded-lg font-semibold">
            Native App Button (Full Width)
          </button>
        ) : (
          <button className="bg-[#E7001E] text-white px-6 py-2 rounded-lg font-semibold">
            Web Button (Auto Width)
          </button>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded text-xs">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({
            screenSize,
            isMobile,
            isTablet,
            isDesktop,
            isNative,
            isWeb,
            isAndroid,
            isIOS
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ResponsiveExample;
