import { IconTemperatureSun, IconUmbrella } from '@tabler/icons-react';
import { Outlet } from 'react-router';
import { CloudArt, SunArt } from '../../components/Illustrations';
import { LogoWithName } from '../../components/Logo';

/** Split screen for the guest pages: illustrated sky panel left, form right (screen 1). */
export function AuthLayout() {
  return (
    <main className="grid min-h-dvh place-items-center p-4 tab:p-8">
      <div className="box grid w-full max-w-[1120px] overflow-hidden tab:grid-cols-[1.15fr_1fr]">
        <SkyPanel />
        <div className="flex flex-col justify-center bg-white px-5 py-8 tab:px-12 tab:py-[52px]">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

function SkyPanel() {
  return (
    <section className="relative flex flex-col overflow-hidden border-b-3 border-ink bg-sky p-6 tab:min-h-[600px] tab:border-r-3 tab:border-b-0 tab:p-10">
      <LogoWithName size={42} className="text-2xl" />
      <h1 className="outlined-title relative z-10 mt-4 mb-3.5 max-w-[70%] text-[40px] leading-[.98] tab:max-w-none tab:text-[58px]">
        Rain at 7?
        <br />
        We'll ping you.
      </h1>
      <p className="relative z-10 mb-5 max-w-[380px] text-lg">
        Pick your spots, set simple rules, and get one email when the weather does its thing.
      </p>
      <div className="relative z-10 hidden flex-col gap-3 tab:flex" aria-hidden="true">
        <SampleAlert icon={IconUmbrella} tint="bg-sky-soft" title="Rain expected in Chennai" detail="Tomorrow 7–9 am · 80% chance" />
        <SampleAlert
          icon={IconTemperatureSun}
          tint="bg-sun-soft"
          title="Heat alert · 39 °C"
          detail="Saturday afternoon · Coimbatore"
          className="ml-9"
        />
      </div>
      <SunArt size={170} animated className="bob absolute top-[70px] -right-3.5 hidden tab:block" />
      <SunArt size={96} animated className="bob absolute top-4 -right-3 tab:hidden" />
      <CloudArt
        width={200}
        height={170}
        animated
        className="bob absolute right-[70px] -bottom-2.5 hidden tab:block"
        style={{ animationDelay: '-1.5s' }}
      />
    </section>
  );
}

function SampleAlert({ icon: Icon, tint, title, detail, className = '' }) {
  return (
    <div className={`flex max-w-[330px] items-center gap-3 rounded-[22px] border-3 border-ink bg-white px-4 py-3.5 shadow-pop-sm ${className}`}>
      <span className={`grid size-[46px] shrink-0 place-items-center rounded-[14px] border-[2.5px] border-ink ${tint}`}>
        <Icon size={24} />
      </span>
      <span>
        <span className="block font-display text-base">{title}</span>
        <span className="block text-[13px] text-muted">{detail}</span>
      </span>
    </div>
  );
}
