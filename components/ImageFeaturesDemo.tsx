"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PhotoUpload } from '@/components/PhotoUpload'
import { ResponsiveImage, AvatarImage as ResponsiveAvatarImage, ProfileImage, CardImage } from '@/components/ui/responsive-image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function ImageFeaturesDemo() {
  const [demoImage, setDemoImage] = useState<string | null>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Image Features Demo</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This demo showcases the enhanced image cropping, responsive design, and avatar features 
          that work across all device types.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced PhotoUpload Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Enhanced PhotoUpload</span>
              <Badge variant="outline">New</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Profile Picture Upload</h3>
              <PhotoUpload
                label="Upload Profile Picture"
                storagePath="demo/profile-picture"
                initialUrl={profileImage ?? undefined}
                onUpload={setProfileImage}
                enableCropping={true}
                aspectRatio={1}
                previewSize="lg"
                quality={0.9}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">General Image Upload</h3>
              <PhotoUpload
                label="Upload Any Image"
                storagePath="demo/general-image"
                initialUrl={demoImage ?? undefined}
                onUpload={setDemoImage}
                enableCropping={true}
                aspectRatio={4/3}
                previewSize="md"
                quality={0.8}
              />
            </div>
          </CardContent>
        </Card>

        {/* Avatar Display Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Avatar Display Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Standard Avatars</h3>
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage 
                    src={profileImage || ''} 
                    alt="Small Avatar" 
                    objectPosition="center"
                  />
                  <AvatarFallback>SA</AvatarFallback>
                </Avatar>
                <Avatar className="w-16 h-16">
                  <AvatarImage 
                    src={profileImage || ''} 
                    alt="Medium Avatar" 
                    objectPosition="center"
                  />
                  <AvatarFallback>MA</AvatarFallback>
                </Avatar>
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={profileImage || ''} 
                    alt="Large Avatar" 
                    objectPosition="center"
                  />
                  <AvatarFallback>LA</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Responsive Avatar Components</h3>
              <div className="flex items-center gap-4">
                <ResponsiveAvatarImage
                  src={profileImage || ''}
                  alt="Responsive Avatar"
                  size="md"
                />
                <ProfileImage
                  src={profileImage || ''}
                  alt="Profile Image"
                  size="lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsive Image Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Image Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Square Aspect</h4>
              <ResponsiveImage
                src={demoImage || 'https://via.placeholder.com/300x300'}
                alt="Square image"
                aspectRatio="square"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Video Aspect</h4>
              <ResponsiveImage
                src={demoImage || 'https://via.placeholder.com/400x225'}
                alt="Video aspect image"
                aspectRatio="video"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Photo Aspect</h4>
              <ResponsiveImage
                src={demoImage || 'https://via.placeholder.com/400x300'}
                alt="Photo aspect image"
                aspectRatio="photo"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Wide Aspect</h4>
              <ResponsiveImage
                src={demoImage || 'https://via.placeholder.com/400x225'}
                alt="Wide aspect image"
                aspectRatio="wide"
                className="rounded-lg"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Card Image Component</h4>
            <div className="max-w-sm">
              <CardImage
                src={demoImage || 'https://via.placeholder.com/400x225'}
                alt="Card image"
                aspectRatio="video"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Object Position Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Object Position Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
            {['top', 'center', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].map((position) => (
              <div key={position} className="space-y-2">
                <h4 className="font-medium text-xs capitalize">{position.replace('-', ' ')}</h4>
                <div className="w-16 h-16 rounded-full overflow-hidden border">
                  <ResponsiveImage
                    src={profileImage || 'https://via.placeholder.com/64x64'}
                    alt={`${position} position`}
                    aspectRatio="square"
                    objectPosition={position as any}
                    className="rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Responsiveness Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile Responsiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              All components are fully responsive and work seamlessly across all device types:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="w-12 h-12 mx-auto mb-2">
                  <ResponsiveImage
                    src={profileImage || 'https://via.placeholder.com/48x48'}
                    alt="Mobile avatar"
                    aspectRatio="square"
                    className="rounded-full"
                  />
                </div>
                <p className="text-xs font-medium">Mobile</p>
                <p className="text-xs text-gray-500">Touch-friendly</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-16 h-16 mx-auto mb-2">
                  <ResponsiveImage
                    src={profileImage || 'https://via.placeholder.com/64x64'}
                    alt="Tablet avatar"
                    aspectRatio="square"
                    className="rounded-full"
                  />
                </div>
                <p className="text-xs font-medium">Tablet</p>
                <p className="text-xs text-gray-500">Optimized layout</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="w-20 h-20 mx-auto mb-2">
                  <ResponsiveImage
                    src={profileImage || 'https://via.placeholder.com/80x80'}
                    alt="Desktop avatar"
                    aspectRatio="square"
                    className="rounded-full"
                  />
                </div>
                <p className="text-xs font-medium">Desktop</p>
                <p className="text-xs text-gray-500">Full features</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Image Cropping</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Interactive crop area selection</li>
                <li>• Zoom and pan controls</li>
                <li>• Rotation support</li>
                <li>• Aspect ratio constraints</li>
                <li>• Quality settings</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Responsive Design</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mobile-first approach</li>
                <li>• Touch-friendly controls</li>
                <li>• Adaptive layouts</li>
                <li>• Performance optimized</li>
                <li>• Cross-device compatibility</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Avatar Enhancements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Object position control</li>
                <li>• Fallback handling</li>
                <li>• Loading states</li>
                <li>• Error recovery</li>
                <li>• Consistent styling</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Performance</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Lazy loading</li>
                <li>• Image optimization</li>
                <li>• Memory management</li>
                <li>• Progressive enhancement</li>
                <li>• Caching strategies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 