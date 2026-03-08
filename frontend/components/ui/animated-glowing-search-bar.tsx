import React from 'react';

interface AnimatedGlowingSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

const AnimatedGlowingSearchBar = ({ 
  value, 
  onChange,
  onKeyDown,
  placeholder = "trk--",
  disabled = false 
}: AnimatedGlowingSearchBarProps) => {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute z-[-1] w-full h-min-screen"></div>
      <div id="poda" className="relative flex items-center justify-center group">
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[70px] max-w-[514px] rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
                        before:bg-[conic-gradient(#e0f2fe,#0284c7_5%,#e0f2fe_38%,#e0f2fe_50%,#0ea5e9_60%,#e0f2fe_87%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[512px] rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(255,255,255,0),#0369a1,rgba(255,255,255,0)_10%,rgba(255,255,255,0)_50%,#38bdf8,rgba(255,255,255,0)_60%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[512px] rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(255,255,255,0),#0369a1,rgba(255,255,255,0)_10%,rgba(255,255,255,0)_50%,#38bdf8,rgba(255,255,255,0)_60%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[512px] rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(255,255,255,0),#0369a1,rgba(255,255,255,0)_10%,rgba(255,255,255,0)_50%,#38bdf8,rgba(255,255,255,0)_60%)] before:transition-all before:duration-[2000ms]
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>

        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[63px] max-w-[507px] rounded-lg blur-[2px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                        before:bg-[conic-gradient(rgba(255,255,255,0)_0%,#7dd3fc,rgba(255,255,255,0)_8%,rgba(255,255,255,0)_50%,#bae6fd,rgba(255,255,255,0)_58%)] before:brightness-[1.4]
                        before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
        </div>

        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[59px] max-w-[503px] rounded-xl blur-[0.5px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
                        before:bg-[conic-gradient(#f0f9ff,#0284c7_5%,#f0f9ff_14%,#f0f9ff_50%,#0ea5e9_60%,#f0f9ff_64%)] before:brightness-[1.3]
                        before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
        </div>

        <div id="main" className="relative group">
          <input 
            placeholder={placeholder}
            type="text" 
            name="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="bg-white border border-sky-200 w-[501px] h-[56px] rounded-lg text-slate-900 px-[59px] text-lg focus:outline-none placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
          />
          <div id="input-mask" className="pointer-events-none w-[100px] h-[20px] absolute bg-gradient-to-r from-transparent to-white top-[18px] left-[70px] group-focus-within:hidden"></div>
          <div id="pink-mask" className="pointer-events-none w-[30px] h-[20px] absolute bg-sky-400 top-[10px] left-[5px] blur-2xl opacity-80 transition-all duration-[2000ms] group-hover:opacity-0"></div>
          <div id="search-icon" className="absolute left-5 top-[15px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none" className="feather feather-search">
              <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
              <line stroke="url(#searchl)" y2="16.65" y1="22" x2="16.65" x1="22"></line>
              <defs>
                <linearGradient gradientTransform="rotate(50)" id="search">
                  <stop stopColor="#0ea5e9" offset="0%"></stop>
                  <stop stopColor="#0284c7" offset="50%"></stop>
                </linearGradient>
                <linearGradient id="searchl">
                  <stop stopColor="#0284c7" offset="0%"></stop>
                  <stop stopColor="#0369a1" offset="50%"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedGlowingSearchBar;
