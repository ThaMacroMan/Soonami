'use client'

import React, { useState } from 'react'
import { Container, Typography, Button } from '@mui/material'
import WalletConnectors from '../components/WalletConnectors'
import { Wallet } from '../types/cardano'
import Link from 'next/link'

export default function WhaleWatchingPage() {
  const [address, setAddress] = useState<string>('')

  const onConnectWallet = async (wallet: Wallet) => {
    try {
      const api = await wallet.enable()
      const [addr] = await api.getUsedAddresses()
      setAddress(addr)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  return (
    <div className="relative">
      {/* SOONAMI Link - Top Left */}
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

      {/* Wallet Connection Section - Top Right */}
      <div className="absolute top-4 right-4">
        {!address ? (
          <WalletConnectors onConnectWallet={onConnectWallet} />
        ) : (
          <span className="text-sm text-white/70">
            Connected: {address.slice(0, 8)}...{address.slice(-8)}
          </span>
        )}
      </div>
 
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Get Started Button */}
        <div className="flex justify-center items-center min-h-[60vh]">
          <Button
            variant="contained"
            className="bg-gradient-to-tr from-blue-500 to-green-500 text-white shadow-lg scale-[2]"
            sx={{ padding: '20px 40px' }}
          >
            Get Started
          </Button>
        </div>
      </Container>
    </div>
  )
}
