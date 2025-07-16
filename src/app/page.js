"use client"
import { useEffect } from "react";
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
// import { FloatingDock } from "@/component/floating-dock";

gsap.registerPlugin(ScrollTrigger);

export default function Page() {
  useEffect(() => {
    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const workSection = document.querySelector(".work");
    const cardsContainer = document.querySelector(".cards");
    const moveDistance = window.innerWidth * 5;
    let currentXPosition = 0;

    const lerp = (start, end, t) => start + (end - start) * t;

    const gridCanvas = document.createElement("canvas");
    gridCanvas.id = "grid-canvas";
    workSection.appendChild(gridCanvas);
    const gridCtx = gridCanvas.getContext("2d");

    const resizeGridCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      [gridCanvas.width, gridCanvas.height] = [
        window.innerWidth * dpr,
        window.innerHeight * dpr,
      ];
      [gridCanvas.style.width, gridCanvas.style.height] = [
        `${window.innerWidth}px`,
        `${window.innerHeight}px`,
      ];
      gridCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scaling
      gridCtx.scale(dpr, dpr);
    };
    resizeGridCanvas();

    const drawGrid = (scrollProgress = 0) => {
      gridCtx.fillStyle = "black";
      gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
      gridCtx.fillStyle = "#f40c3f";
      const [dotSize, spacing] = [1, 30];
      const [rows, cols] = [
        Math.ceil(gridCanvas.height / spacing),
        Math.ceil(gridCanvas.width / spacing) + 15,
      ];
      const offset = (scrollProgress * spacing * 10) % spacing;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          gridCtx.beginPath();
          gridCtx.arc(x * spacing - offset, y * spacing, dotSize, 0, Math.PI * 2);
          gridCtx.fill();
        }
      }
    };

    const lettersScene = new THREE.Scene();
    const lettersCamera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    lettersCamera.position.z = 20;

    const lettersRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    lettersRenderer.setSize(window.innerWidth, window.innerHeight);
    lettersRenderer.setClearColor(0x000000, 0);
    lettersRenderer.setPixelRatio(window.devicePixelRatio);
    lettersRenderer.domElement.id = "letters-canvas";
    workSection.appendChild(lettersRenderer.domElement);

    const createTextAnimationPath = (yPos, amplitude) => {
      const points = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        points.push(
          new THREE.Vector3(
            -25 + 50 * t,
            yPos + Math.sin(t * Math.PI) * -amplitude,
            (1 - Math.pow(Math.abs(t - 0.5) * 2, 2)) * -5
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)),
        new THREE.LineBasicMaterial({ color: 0x000, linewidth: 1 })
      );
      line.curve = curve;
      return line;
    };

    const path = [
      createTextAnimationPath(10, 2),
      createTextAnimationPath(3.5, 1),
      createTextAnimationPath(-3.5, -1),
      createTextAnimationPath(-10, -2),
    ];
    path.forEach((line) => lettersScene.add(line));

    const textContainer = document.querySelector(".text-container");
    const letterPositions = new Map();
    const words = ["", "", "", ""];
    path.forEach((line, i) => {
      const chars = words[i].split("");
      const total = chars.length * 2; // add blank between letters
      line.letterElements = Array.from({ length: total }, (_, idx) => {
        const el = document.createElement("div");
        el.className = "letter";
        let char = "";
        if (chars.length && idx % 2 === 0) {
          char = chars[idx / 2] || "";
        }
        el.textContent = char;
        textContainer.appendChild(el);
        letterPositions.set(el, {
          current: { x: 0, y: 0 },
          target: { x: 0, y: 0 },
        });
        return el;
      });
    });

    const lineSpeedMultipliers = [0.8, 1, 0.7, 0.9];
    const updateTargetPositions = (scrollProgress = 0) => {
      path.forEach((line, lineIndex) => {
        line.letterElements.forEach((element, i) => {
          const point = line.curve.getPoint(
            (i / 14 + scrollProgress * lineSpeedMultipliers[lineIndex]) % 1
          );
          const vector = point.clone().project(lettersCamera);
          const positions = letterPositions.get(element);
          positions.target = {
            x: (-vector.x * 0.5 + 0.5) * window.innerWidth,
            y: (-vector.y * 0.5 + 0.5) * window.innerHeight,
          };
        });
      });
    };

    const updateLetterPositions = () => {
      letterPositions.forEach((positions, element) => {
        const distX = positions.target.x - positions.current.x;
        if (Math.abs(distX) > window.innerWidth * 0.7) {
          [positions.current.x, positions.current.y] = [
            positions.target.x,
            positions.target.y,
          ];
        } else {
          positions.current.x = lerp(
            positions.current.x,
            positions.target.x,
            0.07
          );
          positions.current.y = lerp(
            positions.current.y,
            positions.target.y,
            0.07
          );
        }
        element.style.transform = `translate(-50%, -50%) translate3d(${positions.current.x}px, ${positions.current.y}px, 0px)`;
      });
    };

    const updateCardsPosition = () => {
      const targetX = -moveDistance * (ScrollTrigger.getAll()[0]?.progress || 0);
      currentXPosition = lerp(currentXPosition, targetX, 0.07);
      gsap.set(cardsContainer, {
        x: currentXPosition,
      });
    };

    const animate = () => {
      updateLetterPositions();
      updateCardsPosition();
      lettersRenderer.render(lettersScene, lettersCamera);
      requestAnimationFrame(animate);
    };

    ScrollTrigger.create({
      trigger: ".work",
      start: "top top",
      end: "+=700%",
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        updateTargetPositions(self.progress);
        drawGrid(self.progress);
      },
    });

    drawGrid(0);
    animate();
    updateTargetPositions(0);

    window.addEventListener("resize", () => {
      resizeGridCanvas();
      drawGrid(ScrollTrigger.getAll()[0]?.progress || 0);
      lettersCamera.aspect = window.innerWidth / window.innerHeight;
      lettersCamera.updateProjectionMatrix();
      lettersRenderer.setSize(window.innerWidth, window.innerHeight);
      updateTargetPositions(ScrollTrigger.getAll()[0]?.progress || 0);
    });

    // Cleanup on unmount
    return () => {
      // Remove canvases and letters
      if (gridCanvas && gridCanvas.parentNode) gridCanvas.parentNode.removeChild(gridCanvas);
      if (lettersRenderer.domElement && lettersRenderer.domElement.parentNode) lettersRenderer.domElement.parentNode.removeChild(lettersRenderer.domElement);
      if (textContainer) textContainer.innerHTML = "";
      window.removeEventListener("resize", resizeGridCanvas);
    };
  }, []);

  // Floating dock button data
  const dockItems = [
    { href: "mailto:hello@devstag.com", title: "Mail", icon: null },
    { href: "https://www.youtube.com/", title: "YouTube", icon: null },
    { href: "https://www.instagram.com/", title: "Instagram", icon: null },
  ];

  return (
    <>
      <section className="intro">
        <div className="intro-content">
          <img className="logo" src="/assets/logo.png" alt="Logo" />
          <h1 className="company-name">DEVSTAG&nbsp;STUDIO</h1>
          <p className="tagline">Crafting immersive digital experiences</p>
        </div>
        
      </section>

      <section className="work">
        <div className="text-container"></div>
        <div className="cards">
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/y5jTAbAfY4E" title="Eclipse Horizon" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Eclipse Horizon</p>
              <p>739284</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/FU4QrgBoO8U" title="Vision Link" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Vision Link</p>
              <p>385912</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/oWjwktvc2VM" title="Iro Bond" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Iron Bond</p>
              <p>621478</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/RkiChK5t48U" title="Golden Case" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Golden Case</p>
              <p>839251</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/90EcLpzlm5Y" title="Virtual Space" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Virtual Space</p>
              <p>456732</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/Xn369QC2-rI" title="Smart Vision" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Smart Vision</p>
              <p>974315</p>
            </div>
          </div>
          <div className="card">
            <div className="card-img"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/FpuanQiVlkA" title="Desert Tunnel" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div>
            <div className="card-copy">
              <p>Desert Tunnel</p>
              <p>682943</p>
            </div>
          </div>
        </div>
      </section>

      <section className="outro">
        <div className="outro-content">
          <h2 className="outro-heading">Ready to start a project?</h2>
          <p className="outro-sub">Say hello at <a href="mailto:hello@devstag.com">hello@devstag.com</a></p>
          
          {/* <FloatingDock items={dockItems} /> */}
          

        </div>
        
      </section>
    </>
  );
}
