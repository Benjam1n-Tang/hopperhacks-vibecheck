'use client';
import { darkLogo } from '@/app/assets';
import { members } from '@/app/utils/contants';
import { ChevronsUp } from 'lucide-react';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="bg-primary px-8 rounded-t-4xl">
      <div className="flex flex-col gap-12 mt-auto mx-auto max-w-360 pt-14 pb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center">
              <Image
                src={darkLogo}
                alt="VibeCheck Logo"
                width={40}
                height={40}
                className="inline mr-2"
              />
              <h4
                className="text-neutral-800 text-[28px]"
                style={{ fontFamily: 'var(--font-anton)' }}
              >
                Vibe Check
              </h4>
            </div>
            <div className="text-neutral-800 text-xl max-w-100 lg:w-100">
              Team project by Stony Brook University students for HopperHacks
              2026.
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-x-8 lg:gap-x-32 gap-y-8 lg:gap-y-14">
            {members.map((member) => (
              <div
                key={member.name}
                className="flex flex-col gap-4 lg:gap-6 lg:w-60"
              >
                <div className="flex flex-col gap-0">
                  <h3 className="uppercase text-neutral-800 text-base lg:text-lg font-semibold">
                    {member.name}
                  </h3>
                </div>
                <div className="flex flex-col gap-2 lg:gap-3 uppercase pl-1">
                  {Object.entries(member.socials).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-800 text-xs lg:text-sm hover:underline w-fit inline-block"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-700">
          <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-center pt-6">
            <p className="text-neutral-800 text-sm lg:text-base text-center lg:text-left">
              © 2026 Vibe Check. All rights reserved.{' '}
            </p>
            <div className="text-neutral-800 hover:text-neutral-700 hidden lg:block">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 text-neutral-800 hover:text-neutral-700 hover:cursor-pointer transition-all duration-300 hover:-translate-y-1 rounded-md px-6 py-1 group"
              >
                <ChevronsUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300 text-neutral-800 hover:text-neutral-700" />
                Back To Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
