'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Container, Typography} from '@mui/material'
import Link from 'next/link'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { Timeline } from './Timeline'
import dynamic from 'next/dynamic'

// Use dynamic import with ssr: false for LiveTradeStream to prevent server-side rendering
const DynamicLiveTradeStream = dynamic(
  () => import('./livetrades').then((mod) => mod.LiveTradeStream),
  { ssr: false }
)

// Add at the top of the file, after imports
// Declare global variables for TypeScript
declare global {
  interface Window {
    __showLabelsGlobal?: boolean;
  }
}

// Replace with direct fetch implementation
async function fetchAssetMetadata(assetId: string) {
  try {
    console.log(`\n--- Fetching metadata for asset: ${assetId} ---`);
    
    // Check if API key is available
    if (!process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || 
        process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY.trim() === '') {
      console.warn('Blockfrost API key is missing or invalid');
      return '/default-token.png';
    }
    
    const response = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/assets/${assetId}`,
      {
        headers: {
          'project_id': process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`Blockfrost API error for ${assetId}:`, response.status);
      return '/default-token.png';
    }

    const asset = await response.json();
    
    // Handle base64 logo from metadata
    if (asset.metadata?.logo) {
      const base64Logo = `data:image/png;base64,${asset.metadata.logo}`;
      console.log(`Using base64 logo for ${assetId}`);
      return base64Logo;
    }
    
    // Try onchain image if no base64 logo
    if (typeof asset.onchain_metadata?.image === 'string') {
      const imageUrl = asset.onchain_metadata.image.startsWith('ipfs://')
        ? `https://ipfs.io/ipfs/${asset.onchain_metadata.image.slice(7)}`
        : asset.onchain_metadata.image;
      console.log(`Using onchain image URL: ${imageUrl}`);
      return imageUrl;
    }
  } catch {
    console.warn(`Error fetching metadata for ${assetId}, using default image`);
  }
  
  return '/default-token.png';
}

function CardanoTokens({ 
  tokens, 
  tokenCount,
  planetsRef,
  onSceneReady,
  onOrbsReady,
  showLabels,
}: { 
  tokens: any[], 
  tokenCount: number,
  setTokenCount: (count: number) => void,
  onSelectToken: (token: any) => void,
  planetsRef: React.RefObject<any[]>,
  onSceneReady?: (scene: THREE.Scene) => void,
  speedMultiplier: number,
  setSpeedMultiplier: React.Dispatch<React.SetStateAction<number>>,
  onOrbsReady: () => void,
  loadTokensFromAPI: (type: string) => void,
  isLoadingTokens: boolean,
  showLabels: boolean,
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const controlsRef = useRef<any>(null)
  
  // Create Cardano pattern function
    const createCardanoPattern = () => {
      const points: THREE.Vector3[] = []
      const radius = 35
      
      // Center point for ADA
      points.push(new THREE.Vector3(0, 0, 0))
      
      // Inner ring - 7 dots in a flower pattern
      const innerCount = 7
      for (let i = 0; i < innerCount; i++) {
        const angle = (i / innerCount) * Math.PI * 2 + (Math.PI / innerCount)
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 0.4,
          Math.sin(angle) * radius * 0.4,
          0
        ))
      }
      
      // Middle ring - 7 dots, offset from inner ring
      for (let i = 0; i < innerCount; i++) {
        const angle = (i / innerCount) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 0.7,
          Math.sin(angle) * radius * 0.7,
          0
        ))
      }
      
      // Outer ring - 14 dots
      const outerCount = 14
      for (let i = 0; i < outerCount; i++) {
        const angle = (i / outerCount) * Math.PI * 2 + (Math.PI / outerCount)
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 0.9,
          Math.sin(angle) * radius * 0.9,
          0
        ))
      }

      // Additional outer points - 8 dots
      const extraCount = 8
      for (let i = 0; i < extraCount; i++) {
        const angle = (i / extraCount) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 1.2,
          Math.sin(angle) * radius * 1.2,
          0
        ))
      }
      
      // Extended outer ring - 14 more dots if needed for more tokens
      // This will be used for the "Extended" and "All" ring configurations
      const extendedOuterCount = 14
      for (let i = 0; i < extendedOuterCount; i++) {
        const angle = (i / extendedOuterCount) * Math.PI * 2 + (Math.PI / extendedOuterCount / 2)
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 1.5,
          Math.sin(angle) * radius * 1.5,
          0
        ))
      }
      
      // Final outer ring - 14 more dots for the "All" ring configuration
      const finalOuterCount = 14
      for (let i = 0; i < finalOuterCount; i++) {
        const angle = (i / finalOuterCount) * Math.PI * 2
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius * 1.8,
          Math.sin(angle) * radius * 1.8,
          0
        ))
      }
      
      console.log(`🪐 Created Cardano pattern with ${points.length} points (including center)`);
      console.log(`🪐 Pattern structure:
        - Center (ADA): 1 point
        - Inner ring: 7 points
        - Middle ring: 7 points
        - Outer ring: 14 points
        - Extra ring: 8 points
        - Extended ring: 14 points
        - Final ring: 14 points
        - Total points: ${points.length}
      `);
      
      return points
    } 
    //

  // Create textured sphere function
  const createTexturedSphere = async (size: number, position: THREE.Vector3, imageUrl: string): Promise<THREE.Mesh> => {
      const textureLoader = new THREE.TextureLoader()
      
      return new Promise<THREE.Mesh>((resolve) => {
        // Create a default colored sphere as fallback with vibrant color
        const createFallbackSphere = () => {
          const geometry = new THREE.SphereGeometry(size, 32, 32) // Higher segment count for smoother sphere
          // Use a more vibrant material with better properties
          const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(0x888888), // Lighter base color
            shininess: 80, // Higher shininess for more reflectivity
            emissive: new THREE.Color(0x222222), // Subtle self-illumination
            emissiveIntensity: 0.4 // Increased emissive intensity
            // Removed specular property
          })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.copy(position)
          
          return mesh
        }
        
        // Handle local images differently than remote URLs
        if (imageUrl.startsWith('/')) {
          imageUrl = window.location.origin + imageUrl
        }
        
        // Try to load the texture
        textureLoader.load(
          imageUrl,
          (texture: THREE.Texture) => {
            try {
              // Higher segment count for smoother spheres
              const geometry = new THREE.SphereGeometry(size, 32, 32)
              
              // Enhance texture brightness and contrast
              texture.colorSpace = THREE.SRGBColorSpace
              
              // Apply texture filtering for sharper appearance
              texture.minFilter = THREE.LinearFilter
              texture.magFilter = THREE.LinearFilter
              texture.anisotropy = 16 // Higher anisotropy for sharper textures at angles
              
              // Create a more vibrant material for the textured spheres with deeper colors
              const material = new THREE.MeshPhongMaterial({
                color: 0xdddddd, // Slightly off-white to add subtle depth to colors
                shininess: 150, // Higher shininess for more pronounced reflectivity
                emissive: new THREE.Color(0x222222), // Darker emissive for deeper colors
                emissiveIntensity: 0.3, // Lower emissive intensity to prevent washing out colors
                transparent: true,
                opacity: 1.0
              } as any); // Type cast to bypass type checking
              
              // Apply the texture
              ;(material as any).map = texture
              
              // Boost texture contrast and saturation by adjusting material properties
              try {
                // Adjust material properties to enhance colors
                material.color = new THREE.Color(0xffffff); // Pure white to let texture colors show through
                material.emissive = new THREE.Color(0x222222); // Subtle self-illumination
                material.emissiveIntensity = 0.3; // Lower intensity to prevent washing out colors
                (material as any).shininess = 150; // Higher shininess for more pronounced reflectivity
              } catch (e) {
                console.warn('Could not enhance material properties:', e);
              }
              
              const mesh = new THREE.Mesh(geometry, material)
              mesh.position.copy(position)
              
              // Add a subtle glow effect by creating a slightly larger sphere behind it
              if (size > 1) { // Only add glow to larger spheres
                const glowSize = size * 1.15;
                const glowGeometry = new THREE.SphereGeometry(glowSize, 32, 32);
                const glowMaterial = new THREE.MeshBasicMaterial({
                  color: 0xffffff,
                  transparent: true,
                  opacity: 0.15,
                  side: THREE.BackSide
                } as any); // Type cast to bypass type checking
                const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
                mesh.add(glowMesh); // Add as child to follow parent's position
              }
              
              resolve(mesh)
            } catch (error) {
              console.warn('Error creating textured sphere:', error)
              resolve(createFallbackSphere())
            }
          },
          undefined,
          (error) => {
            console.warn('Error loading texture:', error)
            resolve(createFallbackSphere())
          }
        )
      })
    }

  // Function to clean up the scene
  const cleanupScene = () => {
    if (sceneRef.current) {
      // Remove all meshes from the scene
      while(sceneRef.current.children.length > 0){ 
        const object = sceneRef.current.children[0]
        if (object instanceof THREE.Mesh) {
          if ((object as any).geometry) {
            (object as any).geometry.dispose()
          }
          if ((object as any).material) {
            (object as any).material.dispose()
          }
        }
        sceneRef.current.remove(object)
      }
      
      // Also clean up any label holders that might be in the scene
      if (planetsRef.current) {
        planetsRef.current.forEach(planet => {
          if (planet.mesh && (planet.mesh as any).labelHolder) {
            if (sceneRef.current) {
              sceneRef.current.remove((planet.mesh as any).labelHolder);
            }
            (planet.mesh as any).labelHolder = null;
            (planet.mesh as any).tokenLabel = null;
          }
        });
      }
    }
  }

  // Function to initialize the scene
  const initializeScene = () => {
    if (!containerRef.current) return

    // Clean up existing scene if any
    cleanupScene()

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x000000)

    // Create starry background
    const createStarryBackground = () => {
      const starsGeometry = new THREE.BufferGeometry();
      const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
      });

      // Create 2000 stars with random positions
      const starsVertices = [];
      for (let i = 0; i < 2000; i++) {
        // Create stars in a large sphere around the scene
        const radius = 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starsVertices.push(x, y, z);
      }

      starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
      const starField = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(starField);
      
      console.log('✨ Added starry background with 2000 stars');
      
      return starField;
    };
    
    // Add stars to the scene
    createStarryBackground();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 60, 100)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    // Enhanced renderer settings would go here, but they're not compatible with the current THREE.js typings
    containerRef.current.innerHTML = '' // Clear previous content
    containerRef.current.appendChild(renderer.domElement)

    // Label renderer setup
    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(window.innerWidth, window.innerHeight)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    containerRef.current.appendChild(labelRenderer.domElement)

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 20
    controls.maxDistance = 500
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7) // Slightly reduced ambient light to increase contrast
    scene.add(ambientLight)
    
    // Add more dynamic lighting for better visibility and color depth
    const pointLight = new THREE.PointLight(0xffffff, 1.8, 200) // Increased intensity for stronger highlights
    pointLight.position.set(0, 30, 30)
    scene.add(pointLight)
    
    // Add a second point light from another angle for better illumination
    const pointLight2 = new THREE.PointLight(0xccddff, 1.2, 150) // Cool blue light for depth
    pointLight2.position.set(-40, -10, 40)
    scene.add(pointLight2)
    
    // Add a third point light for more balanced lighting with warm tones
    const pointLight3 = new THREE.PointLight(0xffcc88, 1.0, 150) // Warm orange light for contrast
    pointLight3.position.set(40, 10, -30)
    scene.add(pointLight3)
    
    // Add a fourth light specifically for enhancing color depth
    const pointLight4 = new THREE.PointLight(0xffffff, 0.6, 100) // Focused light for enhancing details
    pointLight4.position.set(0, -30, -20)
    scene.add(pointLight4)
    
    // Create Cardano pattern and orbs
    const points = createCardanoPattern()
    const sortedTokens = tokens.slice(0, tokenCount).sort((a, b) => b.liquidity - a.liquidity)
    const planets: any[] = []

    // Create spheres for other tokens
    const createTokenSpheres = async () => {
      console.log(`🪐 Creating token spheres for ${sortedTokens.length} tokens`);
      console.log(`🪐 Available points: ${points.length} (including ADA at center)`);
      
      // Log the pattern structure
      console.log(`🪐 Pattern structure:
        - Center (ADA): 1 point
        - Inner ring: 7 points
        - Middle ring: 7 points
        - Outer ring: 14 points
        - Extra ring: 8 points
        - Extended ring: 14 points
        - Final ring: 14 points
        - Total points: ${points.length}
      `);
      
      // Log the token count vs. available points
      console.log(`🪐 Token count vs. available points:
        - Tokens: ${sortedTokens.length}
        - Available points (excluding center): ${points.length - 1}
        - Will use: ${Math.min(sortedTokens.length, points.length - 1)} points
      `);
      
      let innerCount = 0;
      let middleCount = 0;
      let outerCount = 0;
      let extendedCount = 0;
      let extraRingCount = 0;
      let finalRingCount = 0;
      
      for (let index = 0; index < sortedTokens.length; index++) {
        if (index >= points.length - 1) {
          console.log(`⚠️ Skipping token ${index + 1} (${sortedTokens[index].ticker || 'Unknown'}) - no more points available`);
          continue;
        }
        
        const token = sortedTokens[index]
        const position = points[index + 1]
        const size = index < 7 ? 2.5 :  // Inner ring (7 points)
                     index < 14 ? 2.0 : // Middle ring (7 points)
                     index < 28 ? 1.5 : // Outer ring (14 points)
                     index < 36 ? 1.2 : // Extra ring (8 points)
                     index < 50 ? 1.0 : // Extended outer ring (14 points)
                     0.8               // Final outer ring (14 points)
                     
        // Track which ring this token is in
        if (index < 7) innerCount++;
        else if (index < 14) middleCount++;
        else if (index < 28) outerCount++;
        else if (index < 36) extraRingCount++;
        else if (index < 50) extendedCount++;
        else finalRingCount++;

        const imageUrl = await fetchAssetMetadata(token.unit) || '/default-token.png'
        const mesh = await createTexturedSphere(size, position, imageUrl)
        scene.add(mesh)
        planets.push({ token, mesh })
        
        // Add token label
        if (showLabels) {
          const labelDiv = document.createElement('div')
          labelDiv.className = 'token-label'
          labelDiv.textContent = token.ticker || token.name || token.unit.substring(0, 8)
          labelDiv.style.color = 'white'
          labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
          labelDiv.style.padding = '2px 2px'
          labelDiv.style.borderRadius = '4px'
          labelDiv.style.fontSize = '10px'
          labelDiv.style.fontWeight = 'bold'
          labelDiv.style.pointerEvents = 'none'
          labelDiv.style.whiteSpace = 'nowrap'
          
          const label = new CSS2DObject(labelDiv)
          label.position.set(0, size + 1, 0) // Position above the sphere
          
          // Create an empty object3D to hold the label at the token's position
          const labelHolder = new THREE.Object3D()
          labelHolder.position.copy(position)
          labelHolder.add(label)
          scene.add(labelHolder)
          
          // Store reference to label and holder for toggling visibility
          ;(mesh as any).tokenLabel = label
          ;(mesh as any).labelHolder = labelHolder
        }
      }
      
      // Log the final counts
      console.log(`🪐 Final token counts by ring:
        - Inner ring: ${innerCount}/7
        - Middle ring: ${middleCount}/7
        - Outer ring: ${outerCount}/14
        - Extra ring: ${extraRingCount}/8
        - Extended ring: ${extendedCount}/14
        - Final ring: ${finalRingCount}/14
        - Total planets: ${planets.length} (including ADA)
      `);
      
      // Log all the tokens that were added
      console.log(`🪐 All tokens added to scene:`);
      planets.forEach((planet, index) => {
        if (index === 0) {
          console.log(`  0. ADA (center)`);
        } else {
          const ringName = 
            index <= innerCount ? "Inner" :
            index <= innerCount + middleCount ? "Middle" :
            index <= innerCount + middleCount + outerCount ? "Outer" :
            index <= innerCount + middleCount + outerCount + extraRingCount ? "Extra" :
            index <= innerCount + middleCount + outerCount + extraRingCount + extendedCount ? "Extended" : "Final";
          console.log(`  ${index}. ${planet.token.ticker || planet.token.name || planet.token.unit.substring(0, 8)} (${ringName} ring)`);
        }
      });

      planetsRef.current = planets
      // Remove the onOrbsReady call from here, as it's now called after ADA disk creation
    }

    createTokenSpheres()

    // Create ADA disk with logo
    const adaLogoUrl = 'Cardano-RGB_Logo-Icon-Blue.png'
    createTexturedSphere(4, points[0], adaLogoUrl).then((adaMesh) => {
      scene.add(adaMesh)
      ;(adaMesh as any).rotation.set(-Math.PI / 2, 0, 0)
      planets.push({ token: { ticker: 'ADA' }, mesh: adaMesh })
      
      // Add ADA label
      if (showLabels) {
        const labelDiv = document.createElement('div')
        labelDiv.className = 'token-label'
        labelDiv.textContent = 'ADA'
        labelDiv.style.color = 'white'
        labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
        labelDiv.style.padding = '2px 2px'
        labelDiv.style.borderRadius = '4px'
        labelDiv.style.fontSize = '11px'
        labelDiv.style.fontWeight = 'bold'
        labelDiv.style.pointerEvents = 'none'
        labelDiv.style.whiteSpace = 'nowrap'
        
        const label = new CSS2DObject(labelDiv)
        label.position.set(0, 6, 0) // Position above the ADA disk
        
        // Create an empty object3D to hold the label at ADA's position
        const labelHolder = new THREE.Object3D()
        labelHolder.position.copy(points[0])
        labelHolder.add(label)
        scene.add(labelHolder)
        
        // Store reference to label and holder for toggling visibility
        ;(adaMesh as any).tokenLabel = label
        ;(adaMesh as any).labelHolder = labelHolder
      }
      
      // Now that all planets including ADA are ready, call onOrbsReady
      console.log('All planets including ADA are ready, calling onOrbsReady')
      onOrbsReady()
    })

    // Animation
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      
      // Rotate all orbs
      planets.forEach((planet, index) => {
        if (index === 0) {
          // Rotate ADA disk around Y axis
          planet.mesh.rotation.y += 0.002
        } else {
          // Rotate other orbs on all axes
          planet.mesh.rotation.x += 0.002
          planet.mesh.rotation.y += 0.003
          planet.mesh.rotation.z += 0.001
        }
      })
      
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()

    // Call onSceneReady with the scene reference
    onSceneReady?.(scene)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      cleanupScene()
    }
  }

  // Effect to handle scene initialization and cleanup
  useEffect(() => {
    console.log('Reinitializing scene with token count:', tokenCount)
    initializeScene()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      cleanupScene()
    }
  }, [tokenCount, tokens]) // Reinitialize when tokenCount or tokens change


  // Effect to handle showLabels changes
  useEffect(() => {
    if (!planetsRef.current) return;
    
    console.log(`Toggling token labels visibility: ${showLabels ? 'show' : 'hide'}`);
    
    // Update all token labels visibility
    planetsRef.current.forEach(planet => {
      if (planet.mesh && (planet.mesh as any).tokenLabel) {
        (planet.mesh as any).tokenLabel.visible = showLabels;
        if ((planet.mesh as any).labelHolder) {
          (planet.mesh as any).labelHolder.visible = showLabels;
        }
      }
    });
  }, [showLabels]);

  // Effect to update beam labels when showLabels changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    console.log(`Updating beam labels visibility: ${showLabels ? 'show' : 'hide'}`);
    
    // Find all beams in the scene and update their label visibility
    sceneRef.current.children.forEach((object: THREE.Object3D) => {
      // Check if this is a beam (has children that are CSS2DObjects with beam-value-label)
      if (object instanceof THREE.Mesh && object.children.length > 0) {
        const child = object.children[0];
        if (child instanceof CSS2DObject && (child as any).element && (child as any).element.className === 'beam-value-label') {
          // This is a beam with a label
          (child as any).visible = showLabels;
          if ((child as any).element) {
            (child as any).element.style.display = showLabels ? 'block' : 'none';
          }
        }
      }
    });
    
    // Also update all DOM elements with the beam-value-label class
    if (typeof document !== 'undefined') {
      const labelElements = document.querySelectorAll('.beam-value-label');
      labelElements.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = showLabels ? 'block' : 'none';
        }
      });
    }
    
    // Update the global showLabels value for new beams
    if (typeof window !== 'undefined') {
      // @ts-expect-error: Adding custom property to window object for global label visibility
      window.__showLabelsGlobal = showLabels;
    }
    
  }, [showLabels]);

  // Add a combined effect to ensure all labels are updated consistently
  useEffect(() => {
    // This effect runs after both token and beam label effects
    // and ensures that any labels that might have been missed are updated
    console.log(`Running combined label visibility update: ${showLabels ? 'show' : 'hide'}`);
    
    // Force a more aggressive DOM update for all labels
    if (typeof document !== 'undefined') {
      // Update all token labels
      const tokenLabels = document.querySelectorAll('.token-label');
      tokenLabels.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = showLabels ? 'block' : 'none';
        }
      });
      
      // Update all beam labels
      const beamLabels = document.querySelectorAll('.beam-value-label');
      beamLabels.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = showLabels ? 'block' : 'none';
        }
      });
    }
    
    // Ensure the global variable is set
    if (typeof window !== 'undefined') {
      window.__showLabelsGlobal = showLabels;
    }
    
    // Small delay to ensure labels are updated after any async operations
    const timeoutId = setTimeout(() => {
      if (typeof document !== 'undefined') {
        // One more check after a delay to catch any labels that might have been added
        const allLabels = document.querySelectorAll('.token-label, .beam-value-label');
        allLabels.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.display = showLabels ? 'block' : 'none';
          }
        });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [showLabels]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" />
    </>
  )
}

function createBeam(
  scene: THREE.Scene,
  fromOrb: THREE.Mesh,
  toOrb: THREE.Mesh,
  action: 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity' | 'zap',
  adaValue: number,
  speedMultiplier: number = 1,
  showLabels: boolean = true
) {
  console.log(`🚀 Creating beam - action: ${action}, adaValue: ${adaValue}, speedMultiplier: ${speedMultiplier}, showLabels: ${showLabels}`);
  console.log(`🔍 From orb position: ${JSON.stringify(fromOrb.position)}`);
  console.log(`🔍 To orb position: ${JSON.stringify(toOrb.position)}`);
  

  // Create a function to get the current speed multiplier
  // This will be used during animation to adapt to speed changes
  const getCurrentSpeedMultiplier = () => speedMultiplier;
  
  // Function to get the current showLabels value from the global variable
  // This allows us to respond to changes in the showLabels state
  const getCurrentShowLabels = () => {
    // Check if we have a global value first
    if (typeof window !== 'undefined' && window.__showLabelsGlobal !== undefined) {
      return window.__showLabelsGlobal;
    }
    // Fall back to the initial value
    return showLabels;
  };
  
  const segments = 100;
  
  // Calculate beam thickness based on ADA value using discrete ranges
  let thickness = 0.001; // Default ultra-thin
  
  // Define thickness ranges
  if (adaValue < 10) {
    thickness = 0.05; // Ultra thin for tiny trades
  } else if (adaValue < 100) {
    thickness = 0.1;   // Very thin for small trades
  } else if (adaValue < 500) {
    thickness = 0.2;   // Thin for medium-small trades
  } else if (adaValue < 1000) {
    thickness = 0.4;   // Medium thickness
  } else if (adaValue < 5000) {
    thickness = 0.7;   // Thick
  } else if (adaValue < 10000) {
    thickness = 1.0;   // Very thick
  } else {
    thickness = 1.5;   // Ultra thick for massive trades
  }
  
  console.log(`📏 Beam thickness: ${thickness} (based on ${adaValue} ADA)`);

  try {
    // Get initial positions from the orbs
    const fromX = fromOrb.position.x;
    const fromY = fromOrb.position.y;
    const fromZ = fromOrb.position.z;
    
    const toX = toOrb.position.x;
    const toY = toOrb.position.y;
    const toZ = toOrb.position.z;
    
    // Calculate distance manually
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dz = toZ - fromZ;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const height = distance * 0.8;
    
    console.log(`📐 Distance between orbs: ${distance}, arc height: ${height}`);
    
    // Generate random offsets for the beam path
    // These will be used to create variation in the beam paths
    const randomOffsetX = (Math.random() - 0.5) * (distance * 0.3);
    const randomOffsetY = (Math.random() - 0.5) * (distance * 0.3);
    const randomOffsetZ = (Math.random() - 0.5) * (distance * 0.2);
    
    // Generate a random control point offset for the middle of the path
    const controlPointOffset = {
      x: randomOffsetX,
      y: randomOffsetY,
      z: randomOffsetZ
    };
    
    console.log(`🎲 Random path offsets: X: ${randomOffsetX.toFixed(2)}, Y: ${randomOffsetY.toFixed(2)}, Z: ${randomOffsetZ.toFixed(2)}`);
    
    // Create the curve points manually with randomness
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      
      // Base arc height calculation
      const arcHeight = Math.sin(t * Math.PI) * height;
      
      // Apply randomness that increases toward the middle and decreases at the ends
      // This ensures the beam still connects properly to the orbs
      const randomFactor = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
      
      // Linear interpolation with randomness
      const x = fromX + (toX - fromX) * t + (controlPointOffset.x * randomFactor);
      const y = fromY + (toY - fromY) * t + (controlPointOffset.y * randomFactor);
      const z = fromZ + (toZ - fromZ) * t + arcHeight + (controlPointOffset.z * randomFactor);
      
      // Create a new Vector3 for each point
      points.push(new THREE.Vector3(x, y, z));
    }
    
    console.log(`📊 Created ${points.length} points for the beam curve`);
    console.log(`📍 First point: ${JSON.stringify(points[0])}`);
    console.log(`📍 Middle point: ${JSON.stringify(points[Math.floor(segments/2)])}`);
    console.log(`📍 Last point: ${JSON.stringify(points[segments])}`);
    
    // Create an initial minimal geometry instead of the full tube
    // This prevents the shadow of the entire beam from appearing at the start
    const dummyPoints = [
      new THREE.Vector3(fromX, fromY, fromZ),
      new THREE.Vector3(fromX + 0.001, fromY + 0.001, fromZ + 0.001)
    ];
    const dummyCurve = new THREE.CatmullRomCurve3(dummyPoints as any);
    const geometry = new THREE.TubeGeometry(dummyCurve, 1, 0.001, 3, false);
    console.log(`🔷 Created minimal initial geometry to prevent shadow`);
  
    // Determine color based on action type
    let beamColor: number;
    switch(action) {
      case 'buy':
        beamColor = 0x00ff66; // Green
        break;
      case 'sell':
        beamColor = 0xff3333; // Red
        break;
      case 'add_liquidity':
        beamColor = 0x9933ff; // Purple
        break;
      case 'remove_liquidity':
        beamColor = 0xff9900; // Orange
        break;
      case 'zap':
        beamColor = 0xffcc00; // Yellow
        break;
      default:
        beamColor = 0x00ff66; // Default to green
    }
    
    // Use MeshStandardMaterial for a more solid appearance
    const material = new THREE.MeshStandardMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0, // Start with zero opacity to make it invisible
      side: THREE.FrontSide, // Use FrontSide instead of DoubleSide for solid appearance
      metalness: 0.3,
      roughness: 0.4,
      emissive: beamColor,
      emissiveIntensity: 0.5
    } as any);
    
    console.log(`🎨 Created MeshStandardMaterial with color for ${action}`);
  
    const beam = new THREE.Mesh(geometry, material);
    scene.add(beam);
    
    // Create ADA value label for the beam only if showLabels is true
    if (showLabels) {
      const valueFormatted = adaValue >= 1000 
        ? `${(adaValue / 1000).toFixed(1)}K ₳` 
        : `${Math.round(adaValue)} ₳`;
      
      // Create action label based on the type
      let actionLabel = '';
      switch(action) {
        case 'buy':
          actionLabel = 'BUY';
          break;
        case 'sell':
          actionLabel = 'SELL';
          break;
        case 'add_liquidity':
          actionLabel = 'ADD LIQ';
          break;
        case 'remove_liquidity':
          actionLabel = 'REM LIQ';
          break;
        case 'zap':
          actionLabel = 'ZAP';
          break;
      }
      
      const labelText = `${actionLabel} ${valueFormatted}`;
        
      const valueDiv = document.createElement('div');
      valueDiv.className = 'beam-value-label';
      valueDiv.textContent = labelText;
      valueDiv.style.color = 'white';
      valueDiv.style.opacity = '0';
      valueDiv.style.display = showLabels ? 'block' : 'none';
      
      // Set background color based on action
      switch(action) {
        case 'buy':
          valueDiv.style.backgroundColor = 'rgba(0, 255, 102, 0.7)';
          break;
        case 'sell':
          valueDiv.style.backgroundColor = 'rgba(255, 51, 51, 0.7)';
          break;
        case 'add_liquidity':
          valueDiv.style.backgroundColor = 'rgba(153, 51, 255, 0.7)';
          break;
        case 'remove_liquidity':
          valueDiv.style.backgroundColor = 'rgba(255, 153, 0, 0.7)';
          break;
        case 'zap':
          valueDiv.style.backgroundColor = 'rgba(255, 204, 0, 0.7)';
          break;
      }
      
      valueDiv.style.padding = '1px 1px';
      valueDiv.style.borderRadius = '4px';
      valueDiv.style.fontSize = '12px';
      valueDiv.style.fontWeight = 'bold';
      valueDiv.style.pointerEvents = 'none';
      valueDiv.style.whiteSpace = 'nowrap';
      
      const valueLabel = new CSS2DObject(valueDiv);
      
      // Position the label at the middle of the curve with a slight offset
      const midPoint = Math.floor(segments / 2);
      valueLabel.position.copy(points[midPoint]);
      // Add a slight offset to make the label more visible
      valueLabel.position.y += 2;
      
      beam.add(valueLabel);
      
      console.log(`✅ Beam created and added to scene with value label: ${labelText}`);
    } else {
      console.log(`✅ Beam created and added to scene without label (labels hidden)`);
    }
    
    // Animation timing
    const startTime = Date.now();
    // Adjust duration based on distance and speed
    const baseDuration = Math.max(2000, Math.min(5000, distance * 100)); 

    // Create a growing beam effect
  function animateBeam() {
    const now = Date.now();
    const elapsed = now - startTime;
    
      // Use the current speed multiplier for real-time speed adjustment
      // Ensure a minimum speed for visibility
      const effectiveSpeed = Math.max(0.1, getCurrentSpeedMultiplier());
      
      // Calculate duration based on speed
      const duration = baseDuration / effectiveSpeed;
      
      const progress = Math.min(1, elapsed / duration);
      
      if (progress < 1) {
        // Create flowing effect by animating the beam along the path
        // We'll use two parameters: the head and tail of the beam
        // The head moves from start to end, and the tail follows with a delay
        
        // Head position (0 to 1)
        const headPosition = Math.min(1, progress * 1.5); // Head moves faster
        
        // Tail position (0 to 1) - follows the head with a delay
        const tailPosition = Math.max(0, progress * 1.5 - 0.5); // Tail follows with a delay
        
        // Create a new set of points for the visible portion of the beam
        if (headPosition > 0 && tailPosition < 1) {
          // Calculate the indices for the visible portion
          const startIndex = Math.floor(tailPosition * segments);
          const endIndex = Math.ceil(headPosition * segments);
          
          // Get the visible portion of points
          const visiblePoints = points.slice(startIndex, endIndex + 1);
          
          // If we have enough points to create a curve
          if (visiblePoints.length > 2) {
            // Type assertion for the mesh and its geometry
            const meshGeometry = (beam as any).geometry;
            if (meshGeometry && typeof meshGeometry.dispose === 'function') {
              meshGeometry.dispose();
            }
            
            // Create a new curve with just the visible points
            const visibleCurve = new THREE.CatmullRomCurve3(visiblePoints as any);
            
            // Create a new geometry for the visible portion with tapering
            // Calculate tapering at the ends
            const radiusSegments = 16; // More segments for smoother circular cross-section
            const newGeometry = new THREE.BufferGeometry();
            const positions: number[] = [];
            const normals: number[] = [];
            const uvs: number[] = [];
            
            // Number of points along the curve
            const tubeSegments = 64;
            
            // Create the tube with tapering
            for (let i = 0; i <= tubeSegments; i++) {
              const u = i / tubeSegments;
              const point = visibleCurve.getPoint(u);
              
              // Calculate tapering factor - full thickness in the middle, tapered at ends
              // Use a sine curve for smooth tapering
              let taper = 1.0;
              
              // Apply more aggressive tapering at the ends
              if (u < 0.1) {
                // First 10% - taper from 0 to full size
                taper = Math.sin((u / 0.1) * Math.PI / 2);
              } else if (u > 0.9) {
                // Last 10% - taper from full size to 0
                taper = Math.sin(((1 - u) / 0.1) * Math.PI / 2);
              }
              
              // Get the normal vectors
              const normal = visibleCurve.getTangent(u);
              const binormal = new THREE.Vector3();
              const tangent = new THREE.Vector3();
              
              // Calculate binormal and tangent
              const up = new THREE.Vector3(0, 1, 0);
              if (Math.abs(normal.y) === 1) {
                up.set(1, 0, 0);
              }
              
              // Use type assertions to fix linter errors
              (tangent as any).crossVectors(up, normal).normalize();
              (binormal as any).crossVectors(normal, tangent).normalize();
              
              // Create circle at this point
              for (let j = 0; j <= radiusSegments; j++) {
                const v = j / radiusSegments;
                const angle = v * Math.PI * 2;
                
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                
                // Calculate position with tapering
                const x = point.x + (cos * binormal.x + sin * tangent.x) * thickness * taper;
                const y = point.y + (cos * binormal.y + sin * tangent.y) * thickness * taper;
                const z = point.z + (cos * binormal.z + sin * tangent.z) * thickness * taper;
                
                positions.push(x, y, z);
                
                // Simple UV mapping
                uvs.push(u, v);
                
                // Approximate normals
                const nx = cos * binormal.x + sin * tangent.x;
                const ny = cos * binormal.y + sin * tangent.y;
                const nz = cos * binormal.z + sin * tangent.z;
                normals.push(nx, ny, nz);
              }
            }
            
            // Create faces
            const indices: number[] = [];
            const verticesPerRow = radiusSegments + 1;
            
            for (let i = 0; i < tubeSegments; i++) {
              for (let j = 0; j < radiusSegments; j++) {
                const a = i * verticesPerRow + j;
                const b = i * verticesPerRow + j + 1;
                const c = (i + 1) * verticesPerRow + j + 1;
                const d = (i + 1) * verticesPerRow + j;
                
                // Create two triangles for each face
                indices.push(a, b, d);
                indices.push(b, c, d);
              }
            }
            
            // Set the attributes
            newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            // Use type assertion to fix linter error
            (newGeometry as any).setIndex(indices);
            
            // Assign the new geometry to the beam
            (beam as any).geometry = newGeometry;
            
            // Update the position of the value label to follow the beam
            if (beam.children.length > 0 && getCurrentShowLabels() && visiblePoints.length > 2) {
              // Position the label at the middle of the visible portion
              const midPointIndex = Math.floor(visiblePoints.length / 2);
              const labelPosition = visiblePoints[midPointIndex];
              
              if (labelPosition) {
                beam.children[0].position.copy(labelPosition);
                // Add a slight offset to make the label more visible
                beam.children[0].position.y += 2;
                
                // Make sure the label is visible only if showLabels is true
                const labelElement = (beam.children[0] as any).element;
                if (labelElement) {
                  labelElement.style.display = getCurrentShowLabels() ? 'block' : 'none';
                }
              }
            } else if (beam.children.length > 0 && !getCurrentShowLabels()) {
              // Hide the label if showLabels is false
              const labelElement = (beam.children[0] as any).element;
              if (labelElement) {
                labelElement.style.display = 'none';
              }
            }
          }
        }
        
        // Update opacity based on progress
        if (progress < 0.1) {
          // Fade in during first 10% - but only for the visible portion
          if (headPosition > 0 && tailPosition < 1) {
            (material as any).opacity = 0.8 * (progress / 0.1);
            
            // Also fade in the label if it exists
            if (beam.children.length > 0 && getCurrentShowLabels()) {
              const labelElement = (beam.children[0] as any).element;
              if (labelElement) {
                labelElement.style.opacity = String(0.8 * (progress / 0.1));
                labelElement.style.display = getCurrentShowLabels() ? 'block' : 'none';
              }
            }
          } else {
            // Keep invisible if no visible portion yet
            (material as any).opacity = 0;
            if (beam.children.length > 0 && getCurrentShowLabels()) {
              const labelElement = (beam.children[0] as any).element;
              if (labelElement) {
                labelElement.style.opacity = '0';
                labelElement.style.display = getCurrentShowLabels() ? 'block' : 'none';
              }
            }
          }
        } else if (progress > 0.9) {
          // Fade out during last 10%
          (material as any).opacity = 0.8 * (1 - ((progress - 0.9) / 0.1));
          
          // Also fade out the label if it exists
          if (beam.children.length > 0 && getCurrentShowLabels()) {
            const labelElement = (beam.children[0] as any).element;
            if (labelElement) {
              labelElement.style.opacity = String(0.8 * (1 - ((progress - 0.9) / 0.1)));
              labelElement.style.display = getCurrentShowLabels() ? 'block' : 'none';
            }
          }
        } else {
          // Full opacity in the middle
          (material as any).opacity = 0.8;
          
          // Full opacity for the label too if it exists
          if (beam.children.length > 0 && getCurrentShowLabels()) {
            const labelElement = (beam.children[0] as any).element;
            if (labelElement) {
              labelElement.style.opacity = "0.8";
              labelElement.style.display = getCurrentShowLabels() ? 'block' : 'none';
            }
          } else if (beam.children.length > 0 && !getCurrentShowLabels()) {
            const labelElement = (beam.children[0] as any).element;
            if (labelElement) {
              labelElement.style.display = 'none';
            }
          }
        }
        
        // Log progress less frequently to reduce console spam
        if (Math.floor(progress * 10) % 2 === 0) {
        }
        
        // Use a higher refresh rate for slow speeds to make animation smoother
        if (effectiveSpeed <= 0.25) {
          // For extremely slow speeds (0.25 TPS and below), use an ultra-high refresh rate
          setTimeout(() => requestAnimationFrame(animateBeam), 1000 / 720); // ~480 FPS for extremely slow speeds (0.25 TPS and below)
        } else if (effectiveSpeed <= 0.5) {
          // For very slow speeds (0.5 TPS and below), use a very high refresh rate
          setTimeout(() => requestAnimationFrame(animateBeam), 1000 / 360); // ~360 FPS for very slow speeds (0.5 TPS and below)
        } else if (effectiveSpeed <= 1) {
          // For speeds of 1 TPS and below, use an extremely high refresh rate
          setTimeout(() => requestAnimationFrame(animateBeam), 1000 / 240); // ~240 FPS for slow speeds (1 TPS and below)
        } else if (effectiveSpeed < 0.1) {
          // For very slow speeds, use a higher refresh rate
          setTimeout(() => requestAnimationFrame(animateBeam), 1000 / 120); // ~120 FPS for slow speeds
        } else if (effectiveSpeed < 0.5) {
          // For moderately slow speeds
          setTimeout(() => requestAnimationFrame(animateBeam), 1000 / 90); // ~90 FPS
        } else {
          // For normal/fast speeds, use standard requestAnimationFrame
          requestAnimationFrame(animateBeam);
        }
      } else {
        // Animation complete, remove the beam
        console.log(`🏁 Beam animation completed, removing from scene`);
        
        // Remove any labels first
        while (beam.children.length > 0) {
          (beam as any).remove(beam.children[0]);
        }
        
        scene.remove(beam);
        // Dispose of geometry and material to free memory
        geometry.dispose();
        (material as any).dispose();
        
        // Call the cleanup function to remove the reference
        // cleanup();
      }
    }
  
    // Start the animation
  animateBeam();
    
    // Return a reference to the beam for potential cleanup
    return beam;
  } catch (error) {
    console.error('❌ Error creating beam:', error);
    return null;
  }
}

// Add TokenSelector component
function TokenSelector({ 
  onLoadTokens, 
  isLoading 
}: { 
  onLoadTokens: (type: string) => void, 
  isLoading: boolean 
}) {
  const [activeMode, setActiveMode] = useState<string>('MARKET CAP');

  return (
    <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-2">

      <div className="flex">
        <button
          onClick={() => {
            onLoadTokens('marketcap');
            setActiveMode('MARKET CAP');
          }}
          disabled={isLoading}
          className={`px-3 py-1 text-xs transition-colors ${
            activeMode === 'MARKET CAP'
              ? "bg-blue-600 text-white" 
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          } rounded-l-md`}
        >
          {isLoading && activeMode === 'MARKET CAP' ? 
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span> : 
            null
          }
          MARKET CAP
        </button>
        <button
          onClick={() => {
            onLoadTokens('liquidity');
            setActiveMode('LIQUIDITY');
          }}
          disabled={isLoading}
          className={`px-3 py-1 text-xs transition-colors ${
            activeMode === 'LIQUIDITY'
              ? "bg-blue-600 text-white" 
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          }`}
        >
          {isLoading && activeMode === 'LIQUIDITY' ? 
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span> : 
            null
          }
          LIQUIDITY
        </button>
        <button
          onClick={() => {
            onLoadTokens('volume');
            setActiveMode('VOLUME');
          }}
          disabled={isLoading}
          className={`px-3 py-1 text-xs transition-colors ${
            activeMode === 'VOLUME'
              ? "bg-blue-600 text-white" 
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          } rounded-r-md`}
        >
          {isLoading && activeMode === 'VOLUME' ? 
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></span> : 
            null
          }
          VOLUME
        </button>
      </div>
    </div>
  );
}

// Export the main page component
export default function BeamPage() {
  const [, setSelectedToken] = useState<any>(null)
  const [visibleTokens, setVisibleTokens] = useState<any[]>([])
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.33)
  const [orbsReady, setOrbsReady] = useState(false)
  const [tokenCount, setTokenCount] = useState(14)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [activeRings, setActiveRings] = useState<string[]>(["Inner", "Middle"])
  // Add a state variable to hold all tokens from API
  const [allTokens, setAllTokens] = useState<any[]>([])
  // Add state for LIVE MODE - default to true for live mode on page load
  const [isLiveMode, setIsLiveMode] = useState(true)

  // Define ring configurations
  const ringConfigs = [
    { name: "Inner", value: 7, tooltip: "Show inner ring tokens (7)" },
    { name: "Middle", value: 14, tooltip: "Show middle ring tokens (14)" },
    { name: "Outer", value: 28, tooltip: "Show outer ring tokens (28)" },
    { name: "Extra", value: 36, tooltip: "Show extra ring tokens (36)" },
    { name: "Extended", value: 50, tooltip: "Show extended ring tokens (50)" },
    { name: "All", value: 64, tooltip: "Show all tokens (64)" }
  ]
  
  // Initialize time values with placeholders, then update on client
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [startTime, setStartTime] = useState<number>(0)
  const planetsRef = useRef<any[]>([])
  const sceneRef = useRef<THREE.Scene | null>(null)
  const speedMultiplierRef = useRef<number>(0.33)
  const lastTimeUpdateRef = useRef<number>(0)
  const tradeStreamRef = useRef<any>(null)
  const [apiLoading, setApiLoading] = useState<boolean>(false)
  // Add a ref to track processed trade hashes
  const processedTradeHashesRef = useRef<Set<string>>(new Set())
  
  // Handle LIVE MODE toggle
  const handleLiveModeToggle = (enabled: boolean) => {
    console.log(`${enabled ? 'Enabling' : 'Disabling'} LIVE MODE`);
    
    // Set the state first to ensure UI updates immediately
    setIsLiveMode(enabled);
    
    // When enabling LIVE MODE, pause the timeline playback
    if (enabled) {
      setIsPlaying(false);
      
      // Use a small timeout to ensure the state has been updated before calling the ref method
      setTimeout(() => {
        // Update the trade stream to LIVE MODE
        if (tradeStreamRef.current && tradeStreamRef.current.enableLiveMode) {
          console.log("Calling enableLiveMode(true) on tradeStreamRef");
          tradeStreamRef.current.enableLiveMode(true);
        } else {
          console.warn("tradeStreamRef.current or enableLiveMode method not available");
        }
      }, 50);
    } else {
      // When disabling LIVE MODE, resume normal playback
      setIsPlaying(true);
      
      // Use a small timeout to ensure the state has been updated before calling the ref method
      setTimeout(() => {
        // Update the trade stream to normal mode
        if (tradeStreamRef.current && tradeStreamRef.current.enableLiveMode) {
          console.log("Calling enableLiveMode(false) on tradeStreamRef");
          tradeStreamRef.current.enableLiveMode(false);
        } else {
          console.warn("tradeStreamRef.current or enableLiveMode method not available");
        }
        
        // When exiting live mode, set the current time to now
        const now = Math.floor(Date.now() / 1000);
        setCurrentTime(now);
        lastTimeUpdateRef.current = now;
        
        // Reset trade fetching state in LiveTradeStream
        if (tradeStreamRef.current && tradeStreamRef.current.resetToTime) {
          console.log('Resetting trade stream to current time after exiting live mode');
          tradeStreamRef.current.resetToTime(now);
        }
      }, 50);
    }
  };

  // Update time every second when playing (but not in LIVE MODE)
  useEffect(() => {
    if (!isPlaying || isLiveMode) return;

    const interval = setInterval(() => {
      setCurrentTime(time => {
        const newTime = Math.min(time + speedMultiplier, Math.floor(Date.now() / 1000));
        lastTimeUpdateRef.current = newTime;
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, isLiveMode]);

  // Load tokens from API when component mounts
  useEffect(() => {
    // Load tokens by market cap by default when the component mounts
    if (allTokens.length === 0) {
      loadTokensFromAPI('marketcap');
    }
  }, []);
  
  // Handle ring selection
  const handleRingSelection = (ring: { name: string, value: number }) => {
    console.log(`Ring selected: ${ring.name} (${ring.value} tokens)`);
    
    // Special case for "All" - it includes all rings
    if (ring.name === "All") {
      setActiveRings(ringConfigs.map(r => r.name));
      setTokenCount(ring.value);
      return;
    }
    
    // Find the index of the selected ring
    const ringIndex = ringConfigs.findIndex(r => r.name === ring.name);
    
    // If the ring is already active, remove it and all higher rings
    if (activeRings.includes(ring.name)) {
      const prevRingValue = ringIndex > 0 ? ringConfigs[ringIndex - 1].value : 0;
      const newActiveRings = activeRings.filter(r => {
        const rIndex = ringConfigs.findIndex(config => config.name === r);
        return rIndex < ringIndex;
      });
      
      setActiveRings(newActiveRings);
      setTokenCount(prevRingValue);
      console.log(`Removed ring: ${ring.name}, new token count: ${prevRingValue}`);
    } 
    // If the ring is not active, add it and all lower rings
    else {
      const newActiveRings = ringConfigs
        .filter((_, i) => i <= ringIndex)
        .map(r => r.name);
      
      setActiveRings(newActiveRings);
      setTokenCount(ring.value);
      console.log(`Added ring: ${ring.name}, new token count: ${ring.value}`);
    }
  };
  
  // Initialize time values on client-side only
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    // Use 30 days ago as the default start time
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
    
    console.log(`Initializing time values - now: ${new Date(now * 1000).toLocaleString()}, thirtyDaysAgo: ${new Date(thirtyDaysAgo * 1000).toLocaleString()}`);
    
    setCurrentTime(now);
    setStartTime(thirtyDaysAgo);
    lastTimeUpdateRef.current = thirtyDaysAgo; // Initialize with the past date, not current time
    
    // Load market cap tokens by default
    loadTokensFromAPI('marketcap');
    
    // Don't initialize live mode here - we'll do it when orbsReady is true
  }, []);

  // Add a new useEffect to initialize live mode when orbsReady becomes true
  useEffect(() => {
    // Only initialize live mode when the 3D scene is ready
    console.log(`orbsReady changed to: ${orbsReady}, isLiveMode: ${isLiveMode}, tradeStreamRef available: ${!!tradeStreamRef.current}`);
    
    if (orbsReady) {
      console.log('3D scene is ready, checking if we should initialize LIVE MODE');
      
      // Add a small delay to ensure the tradeStreamRef is properly set up
      setTimeout(() => {
        if (isLiveMode && tradeStreamRef.current && tradeStreamRef.current.enableLiveMode) {
          console.log('3D scene is ready, initializing in LIVE MODE');
          tradeStreamRef.current.enableLiveMode(true);
          setIsPlaying(false); // Pause timeline playback in live mode
        } else {
          console.log(`Not initializing LIVE MODE because: isLiveMode=${isLiveMode}, tradeStreamRef.current=${!!tradeStreamRef.current}, enableLiveMode=${!!(tradeStreamRef.current && tradeStreamRef.current.enableLiveMode)}`);
        }
      }, 500); // Add a 500ms delay to ensure everything is ready
    }
  }, [orbsReady, isLiveMode]);

  // Keep the ref updated with the current speed multiplier
  useEffect(() => {
    console.log(`🔄 Speed multiplier updated to: ${speedMultiplier}x`);
    speedMultiplierRef.current = speedMultiplier;
    
    // Enhanced debug logging
    if (speedMultiplier < 0.001) {
      console.log(`🐢🐢🐢🐢 EXTREME SLOW MODE: ${speedMultiplier}x - Beams will move extremely slowly`);
    } else if (speedMultiplier < 0.01) {
      console.log(`🐢🐢🐢 ULTRA SLOW MODE: ${speedMultiplier}x - Beams will move very very slowly`);
    } else if (speedMultiplier < 0.1) {
      console.log(`🐢🐢 VERY SLOW MODE: ${speedMultiplier}x - Beams will move very slowly`);
    } else if (speedMultiplier < 1) {
      console.log(`🐢 SLOW MODE: ${speedMultiplier}x - Beams will move slowly`);
    } else {
      console.log(`⚡ NORMAL/FAST MODE: ${speedMultiplier}x - Beams will move at normal or accelerated speed`);
    }
    
    // If we have an active trade stream, inform it of the speed change
    if (tradeStreamRef.current) {
      console.log(`Notifying LiveTradeStream of speed change to ${speedMultiplier}x`);
    }
  }, [speedMultiplier]);

  // Update tokens when tokenCount changes
  useEffect(() => {
    console.log(`Token count changed to: ${tokenCount}`);
    
    // Sort tokens by liquidity and take the top tokenCount
    const sortedTokens = allTokens
      .slice(0, tokenCount)
      .sort((a: any, b: any) => b.liquidity - a.liquidity);
    
    console.log(`Updated visible tokens list with ${sortedTokens.length} tokens`);
    setVisibleTokens(sortedTokens);
    
    // If the trade stream ref exists, update it with the new tokens
    if (tradeStreamRef.current && tradeStreamRef.current.updateTokens && orbsReady) {
      console.log(`Updating trade stream with ${sortedTokens.length} tokens`);
      tradeStreamRef.current.updateTokens(sortedTokens);
      
      // Force a refresh of the trade data by resetting to the current time
      const currentTimeValue = lastTimeUpdateRef.current || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      tradeStreamRef.current.resetToTime(currentTimeValue);
    }
  }, [tokenCount, allTokens, orbsReady]);

  // Add function to load tokens from API
  const loadTokensFromAPI = async (type: string) => {
    try {
      setIsLoadingTokens(true);
      console.log(`Loading tokens by ${type}...`);
      
      // Fetch up to 100 tokens in a single request
      const maxRingValue = ringConfigs[ringConfigs.length - 1].value;
      const limit = Math.min(100, maxRingValue + 10); // Add a buffer of 10 tokens
      
      console.log(`Requesting ${limit} tokens in a single API call`);
      const response = await fetch(`/beam/api/tokens?type=${type}&limit=${limit}&page=1`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const tokens: any[] = [];
      
      if (data.tokens && Array.isArray(data.tokens)) {
        console.log(`API returned ${data.tokens.length} tokens`);
        
        // Create a Set of token units to track unique tokens within this API response
        const tokenUnits = new Set();
        
        // Process tokens and track their units to prevent duplicates
        data.tokens.forEach((token: any) => {
          if (token.unit && !tokenUnits.has(token.unit)) {
            tokenUnits.add(token.unit);
            tokens.push(token);
          } else if (token.unit && tokenUnits.has(token.unit)) {
            console.log(`Skipping duplicate token: ${token.ticker || token.unit}`);
          } else if (!token.unit) {
            console.log(`Skipping token without unit identifier`);
          }
        });
        
        console.log(`Loaded ${tokens.length} unique tokens by ${type} from ${data.tokens.length} total tokens`);
        
        // Update the allTokens state with the new tokens (completely replacing the old ones)
        setAllTokens(tokens);
        
        // Update visible tokens - take the top tokenCount tokens sorted by the appropriate criteria
        let sortedTokens;
        
        // Sort tokens based on the requested type
        switch (type) {
          case 'marketcap':
            sortedTokens = tokens
              .slice(0, tokenCount)
              .sort((a: any, b: any) => b.marketCap - a.marketCap);
            console.log('Sorting tokens by market cap');
            break;
          case 'liquidity':
            sortedTokens = tokens
              .slice(0, tokenCount)
              .sort((a: any, b: any) => b.liquidity - a.liquidity);
            console.log('Sorting tokens by liquidity');
            break;
          case 'volume':
            sortedTokens = tokens
              .slice(0, tokenCount)
              .sort((a: any, b: any) => b.volume - a.volume);
            console.log('Sorting tokens by volume');
            break;
          default:
            // Default to liquidity sorting
            sortedTokens = tokens
              .slice(0, tokenCount)
              .sort((a: any, b: any) => b.liquidity - a.liquidity);
            console.log('Sorting tokens by default criteria (liquidity)');
        }
        
        console.log(`Sorted tokens: ${sortedTokens.length} (requested ${tokenCount})`);
        console.log(`Token count vs. available: requested=${tokenCount}, available=${tokens.length}`);
        
        // Log the first few tokens to see what we're getting
        console.log('First 5 tokens after sorting:');
        sortedTokens.slice(0, 5).forEach((token, index) => {
          console.log(`  ${index + 1}. ${token.ticker || token.name || token.unit.substring(0, 8)} - ${type === 'marketcap' ? token.marketCap : type === 'volume' ? token.volume : token.liquidity}`);
        });
        
        setVisibleTokens(sortedTokens);
        
        // If the trade stream ref exists, update it with the new tokens
        if (tradeStreamRef.current && tradeStreamRef.current.updateTokens && orbsReady) {
          console.log(`Updating trade stream with ${sortedTokens.length} tokens`);
          tradeStreamRef.current.updateTokens(sortedTokens);
          
          // Force a refresh of the trade data by resetting to the current time
          const currentTimeValue = lastTimeUpdateRef.current || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
          tradeStreamRef.current.resetToTime(currentTimeValue);
          
          // Clear the processed trade hashes when loading new tokens
          processedTradeHashesRef.current.clear();
        }
      } else {
        console.error('Invalid token data format:', data);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Handle time changes from timeline
  const handleTimeChange = (newTime: number) => {
    // If we're in LIVE MODE and the user drags the timeline, exit LIVE MODE
    if (isLiveMode) {
      console.log('Exiting LIVE MODE due to timeline interaction');
      setIsLiveMode(false);
      
      // Update the trade stream to normal mode
      if (tradeStreamRef.current && tradeStreamRef.current.enableLiveMode) {
        tradeStreamRef.current.enableLiveMode(false);
      }
    }
    
    console.log(`Timeline adjusted to: ${newTime} (${new Date(newTime * 1000).toLocaleString()})`);
    
    // Validate newTime to ensure it's not a future timestamp
    const now = Math.floor(Date.now() / 1000);
    let safeNewTime = newTime;
    
    if (safeNewTime > now) {
      console.warn(`Future timeline time detected (${safeNewTime}, ${new Date(safeNewTime * 1000).toLocaleString()}). Using 24 hours ago instead.`);
      safeNewTime = now - 86400; // Use 24 hours ago instead
    }
    
    // Also ensure it's not too far in the past
    const oneYearAgo = now - (365 * 24 * 60 * 60);
    if (safeNewTime < oneYearAgo) {
      console.warn(`Timeline time too far in the past (${safeNewTime}, ${new Date(safeNewTime * 1000).toLocaleString()}). Using one week ago instead.`);
      safeNewTime = now - (7 * 24 * 60 * 60); // One week ago
    }
    
    console.log(`Using safe timeline time: ${safeNewTime} (${new Date(safeNewTime * 1000).toLocaleString()})`);
    
    // Update the current time state
    setCurrentTime(safeNewTime);
    lastTimeUpdateRef.current = safeNewTime;
    
    // Reset trade fetching state in LiveTradeStream
    if (tradeStreamRef.current) {
      console.log('Resetting trade stream to new time');
      tradeStreamRef.current.resetToTime(safeNewTime);
    } else {
      console.warn('Trade stream ref not available for reset');
    }
  };


  // Handle a new trade by creating a beam
  const handleNewTrade = (trade: any) => {
    console.log(`📊 Received new trade to visualize:`, trade);
    
    if (!sceneRef.current) {
      console.error('❌ Scene not ready, cannot create beam');
      return;
    }
    
    if (!planetsRef.current || planetsRef.current.length === 0) {
      console.error('❌ Planets not ready, cannot create beam');
      return;
    }
    
    try {
      // Check if we've already processed this trade
      if (trade.hash && processedTradeHashesRef.current.has(trade.hash)) {
        console.log(`⏭️ Skipping already processed trade with hash: ${trade.hash}`);
        return;
      }
      
      // Add this trade hash to our processed set
      if (trade.hash) {
        processedTradeHashesRef.current.add(trade.hash);
      }
      
      // Log detailed information about the trade
      console.log(`🔍 Trade details:
        Token: ${trade.token?.ticker || trade.token?.unit || 'Unknown'}
        Action: ${trade.action || 'Unknown'}
        Amount: ${Math.abs(trade.tokenBAmount || 0)} ADA
        Hash: ${trade.hash || 'Unknown'}
        Time: ${trade.time ? new Date(trade.time * 1000).toLocaleString() : 'Unknown'}
      `);
      
      console.log(`🪐 Available planets:`, planetsRef.current.map(p => p.token?.ticker || p.token?.unit));
      
      // DEBUG: Log all planets with their positions
      console.log(`🔍 DEBUG - All planets with positions:`);
      planetsRef.current.forEach((planet, index) => {
        console.log(`Planet ${index}: ${planet.token?.ticker || planet.token?.unit} at position:`, 
          planet.mesh ? JSON.stringify(planet.mesh.position) : 'No mesh');
      });
      
      // Find source and destination orbs
      let tradeToken = planetsRef.current.find(p => 
        p.token?.unit === trade.token?.unit ||
        p.token?.policy_id === trade.token?.policy_id ||
        p.token?.ticker === trade.token?.ticker
      );
      
      const adaOrb = planetsRef.current[0]; // ADA is always the first orb
      
      // DEBUG: Log the found orbs
      console.log(`🔍 DEBUG - Found trade token:`, tradeToken ? {
        ticker: tradeToken.token?.ticker,
        unit: tradeToken.token?.unit,
        position: tradeToken.mesh ? JSON.stringify(tradeToken.mesh.position) : 'No mesh'
      } : 'Not found');
      
      console.log(`🔍 DEBUG - ADA orb:`, {
        ticker: adaOrb?.token?.ticker,
        position: adaOrb?.mesh ? JSON.stringify(adaOrb.mesh.position) : 'No mesh'
      });
      
      if (!tradeToken) {
        console.error(`❌ Could not find orb for trade token: ${trade.token?.ticker || trade.token?.unit || 'Unknown'}`);
        console.log(`Available tokens:`, planetsRef.current.map(p => ({
          ticker: p.token?.ticker,
          unit: p.token?.unit,
          policy_id: p.token?.policy_id
        })));
        return;
      }
      
      if (!adaOrb) {
        console.error('❌ Could not find ADA orb');
        return;
      }
      
      console.log(`✅ Found orbs - Trade token: ${tradeToken.token?.ticker}, ADA orb available: ${!!adaOrb}`);
      
      // Get current speed multiplier from ref for real-time updates
      const currentSpeed = speedMultiplierRef.current;
      console.log(`🚀 Creating beam with speed multiplier: ${currentSpeed}x`);
      
      // Check if the meshes exist
      if (!tradeToken.mesh) {
        console.error('❌ Trade token mesh is missing');
        return;
      }
      
      if (!adaOrb.mesh) {
        console.error('❌ ADA orb mesh is missing');
        return;
      }
      
      // DEBUG: Check if the trade token is the same as the ADA orb
      if (tradeToken === adaOrb) {
        console.log('Trade token unit:', trade.token?.unit);
        console.log('Trade token ticker:', trade.token?.ticker);
        
        // Try to find the correct token by ticker instead
        const correctTradeToken = planetsRef.current.find(p => 
          p !== adaOrb && p.token?.ticker === trade.token?.ticker
        );
        
        if (correctTradeToken) {
          console.log('✅ Found correct trade token by ticker:', correctTradeToken.token?.ticker);
          console.log('Position:', JSON.stringify(correctTradeToken.mesh.position));
          // Use the correct token instead
          tradeToken = correctTradeToken;
        } else {
          // If we can't find a correct token, just skip this trade
          console.log('⏭️ Skipping trade for ADA token to prevent zero-length beam');
          return;
        }
      }
      
      // Use the current speed multiplier for new beams
      console.log(`🌠 Creating beam for action: ${trade.action}`);
      console.log(`💰 Trade value: ${Math.abs(trade.tokenBAmount)} ADA`);
      
      // Ensure we have valid parameters for createBeam
      if (!trade.action) {
        console.error('❌ Trade action is missing, defaulting to "buy"');
        trade.action = 'buy';
      }
      
      if (!trade.tokenBAmount || isNaN(trade.tokenBAmount)) {
        console.error('❌ Trade amount is invalid, defaulting to 100 ADA');
        trade.tokenBAmount = 100;
      }
      
      // Determine from and to orbs based on action type
      let fromOrb, toOrb;
      
      switch(trade.action) {
        case 'buy':
          fromOrb = adaOrb.mesh;
          toOrb = tradeToken.mesh;
          break;
        case 'sell':
          fromOrb = tradeToken.mesh;
          toOrb = adaOrb.mesh;
          break;
        case 'add_liquidity':
          // For adding liquidity, beam goes from ADA to token
          fromOrb = adaOrb.mesh;
          toOrb = tradeToken.mesh;
          break;
        case 'remove_liquidity':
          // For removing liquidity, beam goes from token to ADA
          fromOrb = tradeToken.mesh;
          toOrb = adaOrb.mesh;
          break;
        case 'zap':
          // For zap, beam goes from ADA to token (similar to buy)
          fromOrb = adaOrb.mesh;
          toOrb = tradeToken.mesh;
          break;
        default:
          // Default to buy behavior
          fromOrb = adaOrb.mesh;
          toOrb = tradeToken.mesh;
      }
      
      // DEBUG: Log the actual positions being used
      console.log(`🔍 DEBUG - Final positions for beam:
        Action: ${trade.action}
        From: ${JSON.stringify(fromOrb.position)}
        To: ${JSON.stringify(toOrb.position)}
        Distance: ${calculateDistance(fromOrb.position, toOrb.position)}
      `);
      
      // Helper spheres removed
      
      const beam = createBeam(
        sceneRef.current,
        fromOrb,
        toOrb,
        trade.action,
        Math.abs(trade.tokenBAmount),
        currentSpeed, // Pass the current speed multiplier
        showLabels
      );
      
      if (beam) {
        console.log(`✨ Successfully created beam for ${trade.action} trade of ${Math.abs(trade.tokenBAmount)} ADA`);
      } else {
        console.error(`❌ Failed to create beam for ${trade.action} trade of ${Math.abs(trade.tokenBAmount)} ADA`);
      }
    } catch (error) {
      console.error('❌ Error creating beam for trade:', error);
    }
  };

  // Helper function to calculate distance between two Vector3 positions
  function calculateDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  const handleSceneReady = (scene: THREE.Scene) => {
    sceneRef.current = scene
  }

  // Add the handleApiLoading function
  const handleApiLoading = (loading: boolean) => {
    setApiLoading(loading);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Typography 
            variant="h6" 
            className="font-bold hover:text-blue-500 transition-colors"
            sx={{ letterSpacing: '0.1em' }}
          >
            SOONAMI
          </Typography>
        </Link>
      </div>


      {apiLoading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-900/80 text-white px-4 py-2 rounded-lg z-50 animate-pulse mt-16">
          Loading Taptools data...
        </div>
      )}

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Only render components when time values are initialized */}
        {currentTime > 0 && startTime > 0 && (
          <>
            <CardanoTokens 
              tokens={allTokens} 
              tokenCount={tokenCount}
              setTokenCount={setTokenCount}
              onSelectToken={setSelectedToken}
              planetsRef={planetsRef}
              onSceneReady={handleSceneReady}
              speedMultiplier={speedMultiplier}
              setSpeedMultiplier={setSpeedMultiplier}
              onOrbsReady={() => setOrbsReady(true)}
              loadTokensFromAPI={loadTokensFromAPI}
              isLoadingTokens={isLoadingTokens}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
            />

            {/* Add TokenSelector to the top controls area */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
              <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-2 flex items-center gap-2">
                <span className="text-white text-sm">Rings:</span>
                <div className="flex">
                  {ringConfigs.map((ring) => (
                    <button
                      key={ring.name}
                      onClick={() => handleRingSelection(ring)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        activeRings.includes(ring.name)
                          ? "bg-blue-600 text-white" 
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                      } ${ring.name === "Inner" ? "rounded-l-md" : ""} ${ring.name === "All" ? "rounded-r-md" : ""}`}
                      title={ring.tooltip}
                    >
                      {ring.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                <span className="text-white text-sm">Speed:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.0001"
                    max="3"
                    step="0.0001"
                    value={speedMultiplier}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value);
                      console.log(`Slider changed: ${newSpeed}x (raw value)`);
                      if (newSpeed <= 0.001) {
                        console.log("🐌🐌🐌 ULTRA SLOW MODE ACTIVATED");
                      } else if (newSpeed <= 0.01) {
                        console.log("🐌🐌 VERY SLOW MODE ACTIVATED");
                      } else if (newSpeed <= 0.1) {
                        console.log("🐌 SLOW MODE ACTIVATED");
                      }
                      setSpeedMultiplier(newSpeed);
                      // Update the ref to ensure it's always current
                      speedMultiplierRef.current = newSpeed;
                    }}
                    className="w-32 accent-blue-500"
                  />
                </div>
                <span className="text-blue-400 text-sm font-medium w-24">
                  {speedMultiplier < 0.001 ? 
                    `${(0.5 / 2).toFixed(2)} TPS` : 
                    speedMultiplier < 0.01 ? 
                      `${(speedMultiplier * 0.5).toFixed(2)} TPS` : 
                      speedMultiplier < 0.1 ? 
                        `${(speedMultiplier * 1).toFixed(1)} TPS` : 
                        speedMultiplier === 0.33 ?
                          `1.0 TPS` :
                          speedMultiplier < 1 ?
                            `${(speedMultiplier * 3).toFixed(1)} TPS` :
                            `${(speedMultiplier * 3).toFixed(0)} TPS`
                  }
                </span>
              </div>
              <TokenSelector 
                onLoadTokens={loadTokensFromAPI}
                isLoading={isLoadingTokens}
              />
              {/* Add hide/show labels button */}
              <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-2">
                <button
                  onClick={() => {
                    console.log(`Toggle labels button clicked, current state: ${showLabels}`);
                    setShowLabels(!showLabels);
                    
                    // Force immediate DOM update for all labels
                    if (typeof document !== 'undefined') {
                      setTimeout(() => {
                        const allLabels = document.querySelectorAll('.token-label, .beam-value-label');
                        allLabels.forEach((element) => {
                          if (element instanceof HTMLElement) {
                            element.style.display = !showLabels ? 'block' : 'none';
                          }
                        });
                      }, 0);
                    }
                  }}
                  className="px-3 py-1 text-xs transition-colors flex items-center"
                >
                  <span className={showLabels ? "text-blue-400" : "text-zinc-400"}>
                    {showLabels ? 'HIDE LABELS' : 'SHOW LABELS'}
                  </span>
                </button>
              </div>
            </div>

            <DynamicLiveTradeStream 
              ref={tradeStreamRef}
              solarTokens={visibleTokens}
              onNewTrade={(trade) => {
                console.log("🌊 LiveTradeStream provided new trade:", trade);
                // Ensure we have all the necessary data for creating a beam
                if (trade && trade.token) {
                  console.log("🔍 Trade details:", {
                    action: trade.action,
                    tokenTicker: trade.token.ticker,
                    tokenUnit: trade.token.unit,
                    tokenBAmount: trade.tokenBAmount
                  });
                  
                  // Make sure visibleTokens is updated with the current tokens
                  if (visibleTokens.length > 0 && !visibleTokens.some(t => 
                    t.unit === trade.token.unit || 
                    t.policy_id === trade.token.policy_id
                  )) {
                    console.log("⚠️ Trade token not in visibleTokens, adding it");
                    setVisibleTokens(prev => [...prev, trade.token]);
                  }
                  
                  // Call handleNewTrade to create the beam
                  handleNewTrade(trade);
                } else {
                  console.error("❌ Invalid trade data received:", trade);
                }
              }}
              refreshInterval={2000}
              autoReconnect={true}
              speedMultiplier={speedMultiplier}
              enabled={orbsReady} // This ensures LiveTradeStream only starts when orbs are ready
              isPlaying={isPlaying}
              startTime={startTime}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              setApiLoading={handleApiLoading}
              isLiveMode={isLiveMode} // Remove the orbsReady dependency here
              key={`trade-stream-${visibleTokens.length}-${orbsReady}-${isLiveMode}`} // Add isLiveMode to the key to force re-render when it changes
            />

            <Timeline
              startTime={startTime}
              endTime={Math.floor(Date.now() / 1000)} // Always use current time as end time
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTimeChange={handleTimeChange}
              onPlayPause={setIsPlaying}
              speedMultiplier={speedMultiplier}
              onLiveModeToggle={handleLiveModeToggle} // Add the LIVE MODE toggle handler
              isLiveMode={isLiveMode} // Pass isLiveMode to Timeline
            />
          </>
        )}
      </Container>
    </div>
  )
}