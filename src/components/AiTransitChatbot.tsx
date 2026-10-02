import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import {
  askAiTransitChatbot,
  extractCleanAiText,
} from "@/lib/n8nAiService";

/**
 * Custom SafarBot Icon from user vector tracer SVG
 */
export function SafarBotIcon({ className = "size-8", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="88 92 378 370"
      className={className}
      {...props}
    >
      {/* Robot Inner White Body */}
      <path
        d="M0 0 C5.9 4.23 10.17 9.62 12.26 16.62 C13.44 24.53 11.07 31.32 6.75 37.92 C2.16 43.75 0.33 43.93 -7.74 46.62 C-7.74 57.51 -7.74 68.4 -7.74 79.62 C-4.1 79.6 -0.47 79.59 3.28 79.57 C15.32 79.52 27.37 79.49 39.41 79.46 C46.71 79.45 54.01 79.43 61.3 79.39 C67.67 79.36 74.04 79.34 80.4 79.33 C83.77 79.33 87.13 79.32 90.5 79.3 C94.27 79.28 98.04 79.28 101.81 79.28 C102.91 79.27 104.01 79.26 105.15 79.24 C117.39 79.29 126.35 81.91 135.16 90.47 C142.08 97.83 144.9 105.19 144.65 115.25 C144.64 116.12 144.64 117 144.63 117.9 C144.61 120.66 144.56 123.42 144.51 126.18 C144.49 128.07 144.47 129.95 144.45 131.84 C144.41 136.43 144.34 141.02 144.26 145.62 C144.97 145.6 145.68 145.59 146.41 145.57 C149.63 145.51 152.85 145.47 156.07 145.43 C157.19 145.4 158.31 145.38 159.46 145.35 C161.07 145.34 161.07 145.34 162.71 145.32 C164.2 145.3 164.2 145.3 165.71 145.28 C168.26 145.62 168.26 145.62 169.89 146.73 C171.92 149.53 171.65 151.79 171.66 155.23 C171.67 156.23 171.67 156.23 171.68 157.25 C171.7 159.45 171.7 161.66 171.69 163.86 C171.7 165.4 171.7 166.93 171.71 168.46 C171.72 171.68 171.71 174.89 171.7 178.1 C171.69 182.22 171.71 186.34 171.74 190.45 C171.76 193.62 171.76 196.79 171.75 199.95 C171.75 201.47 171.76 202.99 171.77 204.51 C171.79 206.63 171.78 208.75 171.76 210.88 C171.76 212.69 171.76 212.69 171.76 214.54 C171.16 218.22 170.2 219.4 167.26 221.62 C164.69 222.07 164.69 222.07 161.84 222.01 C160.81 221.99 159.79 221.98 158.73 221.97 C157.14 221.92 157.14 221.92 155.51 221.87 C153.89 221.84 153.89 221.84 152.24 221.81 C149.58 221.77 146.92 221.7 144.26 221.62 C144.29 223.27 144.29 223.27 144.32 224.95 C144.39 229.07 144.44 233.18 144.48 237.3 C144.5 239.08 144.52 240.85 144.56 242.63 C144.8 255.35 144.31 265.48 136.02 275.8 C129.49 282.54 120.79 286.65 111.39 286.97 C109.62 286.97 107.85 286.96 106.08 286.94 C105.1 286.94 104.13 286.94 103.12 286.94 C101.02 286.93 98.92 286.92 96.82 286.91 C93.49 286.88 90.16 286.88 86.83 286.89 C77.37 286.9 67.9 286.88 58.44 286.83 C52.64 286.79 46.84 286.8 41.04 286.82 C38.84 286.82 36.63 286.81 34.43 286.78 C31.34 286.75 28.26 286.76 25.18 286.78 C23.82 286.75 23.82 286.75 22.44 286.72 C17.44 286.8 14.86 287.47 11.26 291.04 C10.23 292.21 9.23 293.4 8.26 294.62 C7.63 295.3 7 295.99 6.36 296.7 C5.87 297.27 5.38 297.84 4.88 298.43 C2.21 301.53 -0.5 304.58 -3.24 307.62 C-5.89 310.55 -8.53 313.5 -11.12 316.49 C-14.57 320.46 -18.13 324.32 -21.69 328.19 C-24.82 331.6 -27.9 335.05 -30.93 338.55 C-34.05 342.1 -37.25 345.58 -40.46 349.05 C-42.25 351.06 -43.85 353.07 -45.43 355.24 C-48.41 358.3 -50.56 358.45 -54.74 358.62 C-57.99 355.14 -58.11 352.6 -58.08 347.92 C-58.08 347.26 -58.08 346.59 -58.08 345.91 C-58.08 343.72 -58.06 341.54 -58.04 339.35 C-58.03 337.83 -58.03 336.31 -58.02 334.79 C-58.01 330.8 -57.98 326.81 -57.95 322.82 C-57.92 318.74 -57.9 314.67 -57.89 310.59 C-57.86 302.6 -57.81 294.61 -57.74 286.62 C-58.8 286.62 -59.86 286.63 -60.95 286.64 C-70.94 286.7 -80.93 286.74 -90.91 286.77 C-96.05 286.79 -101.19 286.81 -106.32 286.84 C-111.28 286.88 -116.24 286.89 -121.2 286.9 C-123.09 286.91 -124.98 286.92 -126.86 286.93 C-129.52 286.96 -132.17 286.96 -134.83 286.96 C-135.98 286.97 -135.98 286.97 -137.16 286.99 C-147.17 286.93 -154.97 283.21 -162.3 276.49 C-169.92 268.66 -171.91 259.85 -171.84 249.25 C-171.84 248.46 -171.84 247.67 -171.84 246.85 C-171.83 244.34 -171.82 241.82 -171.8 239.3 C-171.8 237.59 -171.8 235.88 -171.79 234.17 C-171.78 229.99 -171.76 225.8 -171.74 221.62 C-172.42 221.64 -173.09 221.66 -173.79 221.68 C-176.86 221.76 -179.92 221.82 -182.99 221.87 C-184.06 221.9 -185.12 221.93 -186.21 221.97 C-187.24 221.98 -188.26 221.99 -189.32 222.01 C-190.26 222.03 -191.21 222.05 -192.18 222.07 C-195.61 221.46 -196.6 220.35 -198.74 217.62 C-199.24 214.54 -199.24 214.54 -199.24 210.88 C-199.25 209.87 -199.25 209.87 -199.26 208.85 C-199.27 206.65 -199.26 204.44 -199.24 202.24 C-199.24 200.7 -199.24 199.17 -199.24 197.64 C-199.24 194.42 -199.23 191.21 -199.21 188 C-199.18 183.88 -199.18 179.76 -199.2 175.65 C-199.2 172.48 -199.2 169.31 -199.18 166.15 C-199.18 164.63 -199.18 163.11 -199.18 161.59 C-199.18 159.47 -199.17 157.35 -199.15 155.23 C-199.14 154.02 -199.14 152.81 -199.13 151.57 C-198.74 148.62 -198.74 148.62 -197.38 146.73 C-194.97 145.09 -193.08 145.28 -190.2 145.32 C-188.59 145.34 -188.59 145.34 -186.95 145.35 C-185.83 145.38 -184.71 145.4 -183.55 145.43 C-182.42 145.44 -181.29 145.46 -180.13 145.47 C-177.33 145.51 -174.54 145.56 -171.74 145.62 C-171.79 143.89 -171.79 143.89 -171.84 142.14 C-171.95 137.82 -172.02 133.5 -172.07 129.19 C-172.1 127.33 -172.14 125.47 -172.19 123.61 C-172.58 109.63 -171.66 100.04 -161.99 89.18 C-155.39 83.08 -147.54 79.49 -138.55 79.5 C-137.5 79.5 -136.46 79.49 -135.38 79.49 C-134.23 79.5 -133.09 79.5 -131.91 79.5 C-130.7 79.5 -129.49 79.5 -128.24 79.5 C-124.92 79.5 -121.61 79.51 -118.3 79.52 C-114.83 79.52 -111.37 79.52 -107.9 79.52 C-101.34 79.53 -94.79 79.54 -88.23 79.55 C-80.76 79.56 -73.29 79.56 -65.82 79.57 C-50.46 79.58 -35.1 79.6 -19.74 79.62 C-19.74 68.73 -19.74 57.84 -19.74 46.62 C-22.71 46.12 -22.71 46.12 -25.74 45.62 C-28.16 44.02 -28.16 44.02 -30.37 41.99 C-31.47 41.01 -31.47 41.01 -32.59 40.02 C-37.73 34.28 -39.46 29.73 -39.3 22.18 C-39.29 21.05 -39.29 21.05 -39.27 19.9 C-39.04 13.99 -37.99 9.92 -33.74 5.62 C-33.11 4.97 -32.49 4.33 -31.84 3.66 C-22.8 -4.88 -10.93 -6.22 0 0 Z"
        fill="#FFFFFF"
        transform="translate(290.7421875,99.3828125)"
      />
      <path
        d="M0 0 C4.8 3.51 8.89 8.13 9.97 14.14 C10.24 21.23 8.35 25.65 3.56 30.88 C-0.19 34.33 -3.84 35.16 -8.88 35.44 C-14.51 35.2 -18.3 33.72 -22.44 29.88 C-26.02 25.93 -27.75 22.22 -28.06 16.88 C-27.7 10.2 -24.59 5.83 -19.75 1.44 C-13.93 -2.49 -6.56 -2.15 0 0 Z"
        fill="#FFFFFF"
        transform="translate(223.4375,241.125)"
      />
      <path
        d="M0 0 C4.1 3 7.97 6.95 9.56 11.88 C10.22 18.32 9.25 23.46 5.56 28.88 C1.35 33.14 -2.94 35.25 -8.94 35.62 C-14.93 35.25 -19.22 33.14 -23.44 28.88 C-27.08 23.52 -28.35 18.24 -27.44 11.88 C-22.17 0.06 -12.3 -4.03 0 0 Z"
        fill="#FFFFFF"
        transform="translate(348.4375,241.125)"
      />
      <path
        d="M0 0 C4.95 0 9.9 0 15 0 C15 17.49 15 34.98 15 53 C10.05 53 5.1 53 0 53 C0 35.51 0 18.02 0 0 Z"
        fill="#FFFFFF"
        transform="translate(435,256)"
      />
      <path
        d="M0 0 C4.95 0 9.9 0 15 0 C15 17.49 15 34.98 15 53 C10.05 53 5.1 53 0 53 C0 35.51 0 18.02 0 0 Z"
        fill="#FFFFFF"
        transform="translate(104,256)"
      />
      <path
        d="M0 0 C3.66 2.06 6.83 4.9 8 9 C8.45 14.59 8.25 18.23 5 23 C1.37 26.45 -1.62 27.32 -6.5 27.56 C-10.17 27.42 -12.63 27.09 -15.56 24.81 C-19.42 20.36 -20.48 16.95 -20.32 10.99 C-19.64 6.75 -17.07 3.94 -13.94 1.19 C-9.33 -1.64 -5.08 -1.27 0 0 Z"
        fill="#FFFFFF"
        transform="translate(283,108)"
      />

      {/* Main Dark Outlines and Features */}
      <path
        d="M0 0 C5.9 4.23 10.17 9.62 12.26 16.62 C13.44 24.53 11.07 31.32 6.75 37.92 C2.16 43.75 0.33 43.93 -7.74 46.62 C-7.74 57.51 -7.74 68.4 -7.74 79.62 C-4.1 79.6 -0.47 79.59 3.28 79.57 C15.32 79.52 27.37 79.49 39.41 79.46 C46.71 79.45 54.01 79.43 61.3 79.39 C67.67 79.36 74.04 79.34 80.4 79.33 C83.77 79.33 87.13 79.32 90.5 79.3 C94.27 79.28 98.04 79.28 101.81 79.28 C102.91 79.27 104.01 79.26 105.15 79.24 C117.39 79.29 126.35 81.91 135.16 90.47 C142.08 97.83 144.9 105.19 144.65 115.25 C144.64 116.12 144.64 117 144.63 117.9 C144.61 120.66 144.56 123.42 144.51 126.18 C144.49 128.07 144.47 129.95 144.45 131.84 C144.41 136.43 144.34 141.02 144.26 145.62 C144.97 145.6 145.68 145.59 146.41 145.57 C149.63 145.51 152.85 145.47 156.07 145.43 C157.19 145.4 158.31 145.38 159.46 145.35 C161.07 145.34 161.07 145.34 162.71 145.32 C164.2 145.3 164.2 145.3 165.71 145.28 C168.26 145.62 168.26 145.62 169.89 146.73 C171.92 149.53 171.65 151.79 171.66 155.23 C171.67 156.23 171.67 156.23 171.68 157.25 C171.7 159.45 171.7 161.66 171.69 163.86 C171.7 165.4 171.7 166.93 171.71 168.46 C171.72 171.68 171.71 174.89 171.7 178.1 C171.69 182.22 171.71 186.34 171.74 190.45 C171.76 193.62 171.76 196.79 171.75 199.95 C171.75 201.47 171.76 202.99 171.77 204.51 C171.79 206.63 171.78 208.75 171.76 210.88 C171.76 212.69 171.76 212.69 171.76 214.54 C171.16 218.22 170.2 219.4 167.26 221.62 C164.69 222.07 164.69 222.07 161.84 222.01 C160.81 221.99 159.79 221.98 158.73 221.97 C157.14 221.92 157.14 221.92 155.51 221.87 C153.89 221.84 153.89 221.84 152.24 221.81 C149.58 221.77 146.92 221.7 144.26 221.62 C144.29 223.27 144.29 223.27 144.32 224.95 C144.39 229.07 144.44 233.18 144.48 237.3 C144.5 239.08 144.52 240.85 144.56 242.63 C144.8 255.35 144.31 265.48 136.02 275.8 C129.49 282.54 120.79 286.65 111.39 286.97 C109.62 286.97 107.85 286.96 106.08 286.94 C105.1 286.94 104.13 286.94 103.12 286.94 C101.02 286.93 98.92 286.92 96.82 286.91 C93.49 286.88 90.16 286.88 86.83 286.89 C77.37 286.9 67.9 286.88 58.44 286.83 C52.64 286.79 46.84 286.8 41.04 286.82 C38.84 286.82 36.63 286.81 34.43 286.78 C31.34 286.75 28.26 286.76 25.18 286.78 C23.82 286.75 23.82 286.75 22.44 286.72 C17.44 286.8 14.86 287.47 11.26 291.04 C10.23 292.21 9.23 293.4 8.26 294.62 C7.63 295.3 7 295.99 6.36 296.7 C5.87 297.27 5.38 297.84 4.88 298.43 C2.21 301.53 -0.5 304.58 -3.24 307.62 C-5.89 310.55 -8.53 313.5 -11.12 316.49 C-14.57 320.46 -18.13 324.32 -21.69 328.19 C-24.82 331.6 -27.9 335.05 -30.93 338.55 C-34.05 342.1 -37.25 345.58 -40.46 349.05 C-42.25 351.06 -43.85 353.07 -45.43 355.24 C-48.41 358.3 -50.56 358.45 -54.74 358.62 C-57.99 355.14 -58.11 352.6 -58.08 347.92 C-58.08 347.26 -58.08 346.59 -58.08 345.91 C-58.08 343.72 -58.06 341.54 -58.04 339.35 C-58.03 337.83 -58.03 336.31 -58.02 334.79 C-58.01 330.8 -57.98 326.81 -57.95 322.82 C-57.92 318.74 -57.9 314.67 -57.89 310.59 C-57.86 302.6 -57.81 294.61 -57.74 286.62 C-58.8 286.62 -59.86 286.63 -60.95 286.64 C-70.94 286.7 -80.93 286.74 -90.91 286.77 C-96.05 286.79 -101.19 286.81 -106.32 286.84 C-111.28 286.88 -116.24 286.89 -121.2 286.9 C-123.09 286.91 -124.98 286.92 -126.86 286.93 C-129.52 286.96 -132.17 286.96 -134.83 286.96 C-135.98 286.97 -135.98 286.97 -137.16 286.99 C-147.17 286.93 -154.97 283.21 -162.3 276.49 C-169.92 268.66 -171.91 259.85 -171.84 249.25 C-171.84 248.46 -171.84 247.67 -171.84 246.85 C-171.83 244.34 -171.82 241.82 -171.8 239.3 C-171.8 237.59 -171.8 235.88 -171.79 234.17 C-171.78 229.99 -171.76 225.8 -171.74 221.62 C-172.42 221.64 -173.09 221.66 -173.79 221.68 C-176.86 221.76 -179.92 221.82 -182.99 221.87 C-184.06 221.9 -185.12 221.93 -186.21 221.97 C-187.24 221.98 -188.26 221.99 -189.32 222.01 C-190.26 222.03 -191.21 222.05 -192.18 222.07 C-195.61 221.46 -196.6 220.35 -198.74 217.62 C-199.24 214.54 -199.24 214.54 -199.24 210.88 C-199.25 209.87 -199.25 209.87 -199.26 208.85 C-199.27 206.65 -199.26 204.44 -199.24 202.24 C-199.24 200.7 -199.24 199.17 -199.24 197.64 C-199.24 194.42 -199.23 191.21 -199.21 188 C-199.18 183.88 -199.18 179.76 -199.2 175.65 C-199.2 172.48 -199.2 169.31 -199.18 166.15 C-199.18 164.63 -199.18 163.11 -199.18 161.59 C-199.18 159.47 -199.17 157.35 -199.15 155.23 C-199.14 154.02 -199.14 152.81 -199.13 151.57 C-198.74 148.62 -198.74 148.62 -197.38 146.73 C-194.97 145.09 -193.08 145.28 -190.2 145.32 C-188.59 145.34 -188.59 145.34 -186.95 145.35 C-185.83 145.38 -184.71 145.4 -183.55 145.43 C-182.42 145.44 -181.29 145.46 -180.13 145.47 C-177.33 145.51 -174.54 145.56 -171.74 145.62 C-171.79 143.89 -171.79 143.89 -171.84 142.14 C-171.95 137.82 -172.02 133.5 -172.07 129.19 C-172.1 127.33 -172.14 125.47 -172.19 123.61 C-172.58 109.63 -171.66 100.04 -161.99 89.18 C-155.39 83.08 -147.54 79.49 -138.55 79.5 C-137.5 79.5 -136.46 79.49 -135.38 79.49 C-134.23 79.5 -133.09 79.5 -131.91 79.5 C-130.7 79.5 -129.49 79.5 -128.24 79.5 C-124.92 79.5 -121.61 79.51 -118.3 79.52 C-114.83 79.52 -111.37 79.52 -107.9 79.52 C-101.34 79.53 -94.79 79.54 -88.23 79.55 C-80.76 79.56 -73.29 79.56 -65.82 79.57 C-50.46 79.58 -35.1 79.6 -19.74 79.62 C-19.74 68.73 -19.74 57.84 -19.74 46.62 C-22.71 46.12 -22.71 46.12 -25.74 45.62 C-28.16 44.02 -28.16 44.02 -30.37 41.99 C-31.47 41.01 -31.47 41.01 -32.59 40.02 C-37.73 34.28 -39.46 29.73 -39.3 22.18 C-39.29 21.05 -39.29 21.05 -39.27 19.9 C-39.04 13.99 -37.99 9.92 -33.74 5.62 C-33.11 4.97 -32.49 4.33 -31.84 3.66 C-22.8 -4.88 -10.93 -6.22 0 0 Z M-155.74 99.55 C-156.28 100.18 -156.81 100.81 -157.37 101.46 C-160.28 106.03 -160.99 110.51 -161.02 115.85 C-161.03 117.08 -161.04 118.31 -161.05 119.58 C-161.05 120.93 -161.05 122.28 -161.05 123.63 C-161.06 125.07 -161.06 126.5 -161.07 127.93 C-161.1 131.81 -161.1 135.7 -161.11 139.58 C-161.11 142.01 -161.12 144.44 -161.13 146.87 C-161.15 155.35 -161.16 163.84 -161.17 172.33 C-161.17 180.22 -161.2 188.11 -161.24 196 C-161.28 202.79 -161.29 209.58 -161.29 216.37 C-161.29 220.42 -161.3 224.47 -161.33 228.52 C-161.36 232.33 -161.36 236.14 -161.34 239.95 C-161.34 241.35 -161.35 242.74 -161.37 244.13 C-161.47 253.49 -160.59 261.44 -153.96 268.52 C-147.72 274.3 -141.88 276.06 -133.56 276.03 C-132.65 276.04 -131.75 276.05 -130.81 276.06 C-127.84 276.08 -124.86 276.09 -121.88 276.09 C-119.81 276.11 -117.74 276.12 -115.67 276.14 C-110.22 276.18 -104.78 276.21 -99.34 276.23 C-90.61 276.26 -81.88 276.33 -73.15 276.39 C-70.1 276.41 -67.05 276.42 -63.99 276.43 C-62.13 276.44 -60.27 276.45 -58.41 276.46 C-57.56 276.46 -56.71 276.46 -55.83 276.46 C-49.97 276.5 -49.97 276.5 -47.74 277.62 C-47.41 297.42 -47.08 317.22 -46.74 337.62 C-44.65 337.85 -44.65 337.85 -43.33 336.22 C-42.79 335.57 -42.24 334.91 -41.68 334.24 C-38.95 331.03 -36.19 327.87 -33.37 324.74 C-32.61 323.9 -31.85 323.06 -31.06 322.19 C-30.3 321.34 -29.53 320.49 -28.74 319.62 C-27.24 317.95 -25.74 316.28 -24.24 314.62 C-21.97 312.09 -19.7 309.57 -17.42 307.05 C-14.04 303.3 -10.67 299.55 -7.37 295.74 C-3.82 291.66 -0.16 287.7 3.53 283.74 C5.65 281.44 7.52 279.23 9.26 276.62 C11.12 276.25 11.12 276.25 13.42 276.25 C14.29 276.25 15.16 276.24 16.06 276.24 C17.02 276.25 17.98 276.25 18.96 276.26 C19.97 276.26 20.98 276.26 22.02 276.26 C24.22 276.25 26.41 276.26 28.61 276.27 C32.09 276.28 35.57 276.27 39.05 276.26 C48.95 276.23 58.85 276.24 68.75 276.26 C74.8 276.27 80.86 276.25 86.91 276.23 C89.21 276.22 91.51 276.23 93.82 276.24 C97.05 276.26 100.28 276.25 103.52 276.23 C104.93 276.25 104.93 276.25 106.37 276.27 C113.93 276.18 120.51 274.04 126.18 268.86 C133.6 260.94 133.7 252.88 133.68 242.49 C133.69 241.05 133.69 239.62 133.7 238.19 C133.73 234.31 133.73 230.43 133.73 226.55 C133.73 223.31 133.74 220.06 133.74 216.82 C133.76 209.16 133.77 201.49 133.76 193.83 C133.75 185.95 133.78 178.06 133.81 170.18 C133.84 163.39 133.85 156.61 133.85 149.82 C133.85 145.78 133.85 141.73 133.88 137.68 C133.9 133.88 133.9 130.07 133.88 126.26 C133.87 124.87 133.88 123.48 133.89 122.09 C133.98 112.68 132.96 105.14 126.7 97.79 C119.62 91.05 110.98 90.17 101.6 90.22 C100.56 90.22 99.52 90.21 98.45 90.2 C95 90.19 91.54 90.19 88.08 90.2 C85.59 90.19 83.1 90.18 80.62 90.17 C74.57 90.15 68.53 90.15 62.48 90.15 C57.57 90.15 52.65 90.15 47.74 90.14 C46.32 90.14 44.9 90.13 43.48 90.13 C42.78 90.13 42.07 90.13 41.34 90.13 C28.01 90.11 14.67 90.11 1.33 90.12 C-10.86 90.12 -23.05 90.1 -35.24 90.07 C-47.77 90.04 -60.3 90.02 -72.83 90.02 C-79.86 90.03 -86.89 90.02 -93.92 90 C-100.53 89.97 -107.14 89.98 -113.75 90 C-116.17 90 -118.6 90 -121.02 89.98 C-124.33 89.96 -127.64 89.98 -130.96 90 C-132.39 89.98 -132.39 89.98 -133.85 89.96 C-142.2 90.07 -150.31 92.91 -155.74 99.55 Z"
        fill="#030303"
        transform="translate(290.7421875,99.3828125)"
      />
      <path
        d="M0 0 C6.17 5.48 10.44 11.08 11.38 19.35 C11.87 29.56 9.91 37.43 3.07 45.19 C-3.09 50.94 -9.46 53.55 -17.94 53.38 C-18.64 53.36 -19.35 53.35 -20.07 53.34 C-28.49 53.08 -33.97 51 -40.1 45.19 C-46.76 37.5 -48.97 29.64 -48.52 19.55 C-47.25 10.8 -42.71 4.56 -36 -1 C-24.78 -9.13 -11 -7.57 0 0 Z"
        fill="#050505"
        transform="translate(358,234)"
      />
      <path
        d="M0 0 C5.83 4.2 9.95 10.12 12 17 C13.27 28.54 11.76 36.07 4.68 45.14 C-0.04 50.37 -5.63 53.73 -12.71 54.3 C-23.34 54.45 -31.12 53.75 -39.1 46.19 C-45.76 38.5 -47.97 30.64 -47.52 20.55 C-46.27 11.97 -41.82 5.27 -35 0 C-23.46 -7.09 -11.77 -6.64 0 0 Z"
        fill="#050505"
        transform="translate(232,233)"
      />
      <path
        d="M0 0 C2.39 1.21 2.39 1.21 4.81 2.81 C12.87 8.14 19.69 9.56 29.19 9.5 C30.2 9.5 31.22 9.49 32.26 9.49 C41.84 9.28 49.53 7.23 57.5 1.69 C60.33 -0.22 61.66 -0.63 65 0 C67.62 1.63 67.95 2.82 68.75 5.81 C67.88 9.52 67.27 9.94 64.25 12.06 C49.18 21.09 33.48 24.18 16.18 21.38 C7.84 19.27 -1.78 15.22 -8 9 C-8.46 3.72 -8.46 3.72 -6.81 1.12 C-4.35 -0.4 -2.87 -0.26 0 0 Z"
        fill="#070707"
        transform="translate(247,315)"
      />
    </svg>
  );
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
}

const INITIAL_WELCOME_MESSAGE = `👋 Namaste! I'm your **SafarBot**

Ask me any questions about traveling in **Nagpur**:

• 🚌 **Aapli Bus**: Routes, bus numbers, stops & schedules

• 🚇 **Nagpur Metro**: Orange/Aqua lines, station, timings & fares

• 💰 **Fares & Passes**: Ticket rates, Mahacard discounts & senior concessions

How can I help you travel today?`;

const QUICK_PROMPT_CHIPS = [
  "🚌 How to book Metro Tickets",
  "🚌 How to book Aapli Bus Tickets",
  "💳 How to apply for Maha Metro Smart Card",
  "📍 How to reach Airport from Nagpur Railway Station?",
  "🛗 What are the operational timings of Metro and Aapli Bus?",
];

export interface AiTransitChatbotProps {
  currentJourney?: any | null | undefined;
  allJourneys?: any | null | undefined;
  selectedJourneyIndex?: number | undefined;
  originName?: string | null | undefined;
  destinationName?: string | null | undefined;
  onSelectJourney?: ((index: number) => void) | undefined;
}

export default function AiTransitChatbot(props?: AiTransitChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("safarbot_theme");
      if (saved) return saved === "dark";
      return true; // default dark mode
    }
    return true;
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("safarbot_theme", next ? "dark" : "light");
      }
      return next;
    });
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: INITIAL_WELCOME_MESSAGE,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeakingId(null);
      }
    }
  }, [isOpen]);

  /**
   * Handles sending user queries to n8n AI Chatbot
   */
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const journeyContext =
        props?.currentJourney && props?.originName && props?.destinationName
          ? {
              journey: props.currentJourney,
              originName: props.originName,
              destinationName: props.destinationName,
              routeIndex: props.selectedJourneyIndex ?? 0,
            }
          : null;

      const rawResponse = await askAiTransitChatbot(text, journeyContext);
      const cleanText = extractCleanAiText(rawResponse);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: cleanText || "I am your SafarBot. How can I help you travel in Nagpur today?",
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: `⚠️ **Could not connect to n8n AI Agent.**\n${err?.message || "Please check your network or n8n workflow."}`,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    const cleanText = text
      .replace(/[*#_`>~]/g, "")
      .replace(/•/g, "")
      .replace(/👋|📍|🚶|🚌|🔄|🚇|💡|🌱|🌟|⚠️|⚡|🏆|⚖️|🔍|💳|🛗|💰/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeakingId(msgId);
  };

  const handleCopy = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const handleClearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeakingId(null);
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        text: INITIAL_WELCOME_MESSAGE,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* ── 1. Floating Bottom-Right Chat Button (True Glassmorphic) ── */}
      <div className="fixed bottom-5 right-5 z-[1200]">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center rounded-full bg-gradient-to-br from-emerald-500/45 via-teal-600/35 to-emerald-700/45 p-2 text-white backdrop-blur-2xl border border-white/35 shadow-[0_8px_32px_0_rgba(16,185,129,0.35),inset_0_1px_2px_0_rgba(255,255,255,0.5)] transition-all duration-300 ease-in-out hover:scale-105 hover:pr-4.5 hover:from-emerald-500/60 hover:via-teal-600/50 hover:to-emerald-700/60 hover:border-white/55 hover:shadow-[0_12px_40px_0_rgba(16,185,129,0.5),inset_0_1px_3px_0_rgba(255,255,255,0.7)] active:scale-95 cursor-pointer"
            title="Chat with SafarBot"
            aria-label="Chat with SafarBot"
          >
            {/* Chatbot Logo Icon */}
            <div className="relative flex size-12 shrink-0 items-center justify-center text-white transition-transform duration-300 group-hover:rotate-6">
              <SafarBotIcon className="size-11 drop-shadow-sm" />
            </div>

            {/* Expandable Label on Hover */}
            <div className="grid grid-cols-[0fr] transition-all duration-300 ease-in-out group-hover:grid-cols-[1fr] group-hover:pl-2.5">
              <div className="overflow-hidden whitespace-nowrap">
                <div className="text-[13.5px] font-bold tracking-tight flex items-center gap-1.5 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100 text-white drop-shadow-xs pr-1">
                  <span>Chat with SafarBot</span>
                </div>
              </div>
            </div>
          </button>
        ) : null}
      </div>

      {/* ── 2. Theme-Responsive Chatbot Window ── */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-[1200] flex h-[580px] w-[395px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            isDarkMode
              ? "border border-slate-800/90 bg-slate-950 text-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]"
              : "border border-slate-200/90 bg-white text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 text-white transition-colors duration-300 ${
              isDarkMode
                ? "border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/80"
                : "border-b border-emerald-600/20 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-1 text-white shadow-md shadow-emerald-950/40">
                <SafarBotIcon className="size-8 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight flex items-center gap-1.5 text-white">
                  <span>SafarBot</span>
                </h3>
                <p
                  className={`text-[10.5px] ${
                    isDarkMode ? "text-slate-400" : "text-emerald-100"
                  }`}
                >
                  Official Nagpur Transit Assistant
                </p>
              </div>
            </div>

            {/* Header Action Buttons (Theme Toggle, Clear, Close) */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
                className={`rounded-lg p-1.5 transition ${
                  isDarkMode
                    ? "text-amber-400 hover:bg-slate-800 hover:text-amber-300"
                    : "text-amber-200 hover:bg-white/15 hover:text-white"
                }`}
              >
                {isDarkMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
              <button
                onClick={handleClearChat}
                title="Clear chat history"
                className={`rounded-lg p-1.5 transition ${
                  isDarkMode
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-emerald-100 hover:bg-white/15 hover:text-white"
                }`}
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className={`rounded-lg p-1.5 transition ${
                  isDarkMode
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-emerald-100 hover:bg-white/15 hover:text-white"
                }`}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            className={`flex-1 space-y-4 overflow-y-auto p-3.5 text-xs transition-colors duration-300 ${
              isDarkMode ? "bg-slate-900/40" : "bg-slate-50/80"
            }`}
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSpeaking = isSpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm transition-colors duration-300 ${
                      isUser
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs shadow-md shadow-emerald-950/20"
                        : isDarkMode
                        ? "border border-slate-800 bg-slate-900 text-slate-200 rounded-bl-xs shadow-xs"
                        : "border border-slate-200 bg-white text-slate-800 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    <div className="text-[12.5px] leading-relaxed">
                      <ReactMarkdown
                        components={{
                          strong: ({ children }) => (
                            <strong
                              className={`font-bold ${
                                isUser
                                  ? "text-white"
                                  : isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-700"
                              }`}
                            >
                              {children}
                            </strong>
                          ),
                          p: ({ children }) => (
                            <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="my-1.5 list-disc pl-4 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-1.5 list-decimal pl-4 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => <li className="my-0.5">{children}</li>,
                          code: ({ children }) => (
                            <code
                              className={`rounded px-1 py-0.5 font-mono text-[11px] ${
                                isDarkMode
                                  ? "bg-slate-800 text-emerald-300"
                                  : "bg-slate-100 text-emerald-800"
                              }`}
                            >
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Message Action Bar (Timestamp, Audio, Copy) */}
                  <div
                    className={`mt-1 flex items-center gap-2 px-1 text-[10px] ${
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    <span>{msg.time}</span>

                    {!isUser && msg.id !== "welcome-msg" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.text)}
                          title={isSpeaking ? "Stop Audio" : "Listen to audio response"}
                          className={`transition ${
                            isDarkMode
                              ? "text-slate-400 hover:text-emerald-400"
                              : "text-slate-400 hover:text-emerald-600"
                          }`}
                        >
                          {isSpeaking ? (
                            <VolumeX className="size-3 text-amber-400" />
                          ) : (
                            <Volume2 className="size-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          title="Copy response"
                          className={`transition ${
                            isDarkMode
                              ? "text-slate-400 hover:text-emerald-400"
                              : "text-slate-400 hover:text-emerald-600"
                          }`}
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div
                className={`flex items-center gap-2 text-xs font-medium ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <div
                  className={`flex size-7 items-center justify-center rounded-lg border p-0.5 ${
                    isDarkMode
                      ? "bg-emerald-950/60 border-emerald-800/40 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}
                >
                  <SafarBotIcon className="size-5" />
                </div>
                <div
                  className={`flex items-center gap-1 rounded-2xl border px-3 py-2 ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-900"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-emerald-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Chips (Hidden Scrollbar) */}
          <div
            className={`flex gap-1.5 overflow-x-auto px-3 py-2 border-t [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-colors duration-300 ${
              isDarkMode
                ? "border-slate-850 bg-slate-900/70"
                : "border-slate-200/80 bg-slate-50/90"
            }`}
          >
            {QUICK_PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                disabled={isLoading}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition active:scale-95 ${
                  isDarkMode
                    ? "border-slate-800 bg-slate-850/80 text-slate-300 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 shadow-2xs"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className={`flex items-center gap-2 border-t p-2.5 transition-colors duration-300 ${
              isDarkMode
                ? "border-slate-800 bg-slate-950"
                : "border-slate-200 bg-white"
            }`}
          >
            <div
              className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-1.5 transition ${
                isDarkMode
                  ? "border-slate-800 bg-slate-900 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30"
                  : "border-slate-200 bg-slate-50 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500/20"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask any transit query (bus, metro, fare)..."
                disabled={isLoading}
                className={`flex-1 bg-transparent py-0.5 text-xs focus:outline-none ${
                  isDarkMode
                    ? "text-slate-100 placeholder:text-slate-500"
                    : "text-slate-800 placeholder:text-slate-400"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-950/40 transition hover:from-emerald-500 hover:to-teal-400 active:scale-95 disabled:opacity-40"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
