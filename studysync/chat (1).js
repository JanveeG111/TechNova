// =============================================
//  StudySync — Chat & Messaging System
//  File: js/chat.js
//  Features: 1-on-1 Chat, Group Chat, File Sharing, Real-time Messages
// =============================================

import { db, auth, storage } from "./firebase-config.js";

import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  updateDoc,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ============================================================================
// 1️⃣  GET CHAT ROOM ID - 1-on-1 Chat Ke Liye Unique ID
// ============================================================================
// Dono users ke beech unique room ID banao (consistent rahe)

export function getChatRoomId(uid1, uid2) {
  // Sort karo taaki UID order matter na kare
  // "user1_user2" or "user2_user1" → always "user1_user2"
  return [uid1, uid2].sort().join("_");
}

// EXAMPLE:
// getChatRoomId("abc", "xyz") → "abc_xyz"
// getChatRoomId("xyz", "abc") → "abc_xyz" (same!)

// ============================================================================
// 2️⃣  SEND MESSAGE - 1-on-1 Chat Mein Message Bhejo
// ============================================================================
// Text message ya file URL ko message ke roop mein save karo

export async function sendMessage(roomId, text, type = "text") {
  try {
    console.log("📤 Sending message in room:", roomId);

    // Current user ki info lo
    const uid = auth.currentUser.uid;
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.data();

    // Message ko database mein save karo
    // Path: chats/{roomId}/messages/{auto_id}
    const messageRef = await addDoc(
      collection(db, "chats", roomId, "messages"), 
      {
        uid: uid,
        senderName: userData.name,
        senderPhoto: userData.photoURL || "",
        text: text,
        type: type,  // "text", "image", "file"
        createdAt: serverTimestamp(),
        read: false
      }
    );

    console.log("✅ Message sent:", messageRef.id);

    // Room document ko update karo (last message show karne ke liye)
    await setDoc(
      doc(db, "chats", roomId), 
      {
        lastMessage: type === "text" ? text : `[${type}]`,
        lastSenderName: userData.name,
        updatedAt: serverTimestamp(),
        members: [uid]
      }, 
      { merge: true }
    );

  } catch (err) {
    console.error("❌ Error sending message:", err.message);
  }
}

// USAGE:
// await sendMessage("user123_user456", "Hey! Kaise ho?");

// ============================================================================
// 3️⃣  SEND FILE - Image ya Document Share Karo
// ============================================================================
// File upload karo storage mein aur link ko message banao

export async function sendFile(roomId, file) {
  try {
    console.log("📦 Uploading file:", file.name);

    const uid = auth.currentUser.uid;
    
    // Unique file path banao
    const fileRef = ref(
      storage, 
      `chat_files/${roomId}/${Date.now()}_${file.name}`
    );

    // File upload karo
    const uploadTask = await uploadBytes(fileRef, file);
    console.log("✅ File uploaded to storage");

    // Public download URL lo
    const url = await getDownloadURL(fileRef);

    // Check karo: image hai ya document?
    const fileType = file.type.startsWith("image/") ? "image" : "file";

    // File link ko message banao
    await sendMessage(roomId, url, fileType);

    console.log("✅ File shared as message");
    return url;

  } catch (err) {
    console.error("❌ Error uploading file:", err.message);
  }
}

// USAGE:
// const file = document.getElementById("fileInput").files[0];
// await sendFile("user123_user456", file);

// ============================================================================
// 4️⃣  LISTEN TO MESSAGES - Real-time Messages Dekho
// ============================================================================
// Live listener - jab message aaye to automatically update

export function listenToMessages(roomId, callback) {
  try {
    console.log("👂 Listening to messages in room:", roomId);

    // Query: messages ko time order mein sort karo
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("createdAt", "asc")  // Purana → Naya order
    );

    // Real-time listener setup karo
    // Jab bhi message add/update ho → callback call hoga
    const unsubscribe = onSnapshot(q, (snap) => {
      // Sab messages ko array mein convert karo
      const messages = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      console.log("📨 Messages received:", messages.length);
      
      // UI update karne ke liye callback call karo
      callback(messages);
    });

    // Return unsubscribe function - jab listener hatana ho
    return unsubscribe;

  } catch (err) {
    console.error("❌ Error listening to messages:", err.message);
  }
}

// USAGE:
// const unsubscribe = listenToMessages("user123_user456", (messages) => {
//   console.log("New messages:", messages);
//   // Update UI with messages
// });
// 
// // Later, jab listener remove karna ho:
// unsubscribe();

// ============================================================================
// 5️⃣  GET CHAT HISTORY - Purana Messages Fetch Karo
// ============================================================================
// Pehle se kuch messages ho to fetch karo (infinite scroll ke liye)

export async function getChatHistory(roomId, limit = 50) {
  try {
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("createdAt", "desc"),
      // Note: limit import nahi kiya to manual check kar sakte ho
    );

    const snap = await getDocs(q);
    const messages = snap.docs
      .reverse()  // Reverse karo (desc se asc order mein)
      .slice(-limit)  // Last 'limit' messages lo
      .map(d => ({ id: d.id, ...d.data() }));

    console.log("✅ Chat history fetched:", messages.length);
    return messages;

  } catch (err) {
    console.error("❌ Error fetching chat history:", err.message);
    return [];
  }
}

// ============================================================================
// 6️⃣  MARK MESSAGE AS READ
// ============================================================================
// Message ko read mark karo (notification remove karne ke liye)

export async function markMessageAsRead(roomId, messageId) {
  try {
    const docRef = doc(db, "chats", roomId, "messages", messageId);
    await updateDoc(docRef, { read: true });
    console.log("✅ Message marked as read");
  } catch (err) {
    console.error("❌ Error marking message as read:", err.message);
  }
}

// ============================================================================
// 7️⃣  CREATE GROUP - Study Group Banao
// ============================================================================
// Naya study group create karo

export async function createGroup(groupData) {
  try {
    console.log("👥 Creating new group");

    const uid = auth.currentUser.uid;
    
    // Current user ka profile fetch karo
    const userSnap = await getDoc(doc(db, "users", uid));
    const userData = userSnap.data();

    // Auto-ID ke saath naya group document banao
    const groupRef = doc(collection(db, "groups"));
    
    await setDoc(groupRef, {
      // Group information
      name: groupData.name || "Untitled Group",
      description: groupData.description || "",
      icon: groupData.icon || "📚",
      
      // Creator information
      createdBy: uid,
      creatorName: userData.name,
      creatorPhoto: userData.photoURL || "",
      
      // Group preferences (creator se)
      subject: userData.subject,
      language: userData.language,
      category: userData.category,
      
      // Members
      members: [uid],
      memberCount: 1,
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log("✅ Group created:", groupRef.id);
    return groupRef.id;

  } catch (err) {
    console.error("❌ Error creating group:", err.message);
    return null;
  }
}

// USAGE:
// const groupId = await createGroup({
//   name: "JEE Maths Study",
//   description: "Senior year preparation"
// });

// ============================================================================
// 8️⃣  JOIN GROUP - Group Mein Add Ho Jao
// ============================================================================
// Existing group mein join karo

export async function joinGroup(groupId) {
  try {
    console.log("🚪 Joining group:", groupId);

    const uid = auth.currentUser.uid;
    const groupRef = doc(db, "groups", groupId);
    
    // Check karo: group exist karta hai?
    const snap = await getDoc(groupRef);
    
    if (!snap.exists()) {
      console.log("❌ Group not found");
      return { success: false, error: "Group not found" };
    }

    const groupData = snap.data();
    const members = groupData.members || [];
    
    // Check karo: already member toh nahi?
    if (members.includes(uid)) {
      console.log("⚠️ Already a member of this group");
      return { success: true, message: "Already a member" };
    }

    // New member ko add karo
    await updateDoc(groupRef, {
      members: [...members, uid],
      memberCount: members.length + 1,
      updatedAt: serverTimestamp()
    });

    console.log("✅ Successfully joined group");
    return { success: true };

  } catch (err) {
    console.error("❌ Error joining group:", err.message);
    return { success: false, error: err.message };
  }
}

// USAGE:
// const result = await joinGroup("group_abc123");
// if (result.success) console.log("✅ Joined!");

// ============================================================================
// 9️⃣  SEND GROUP MESSAGE
// ============================================================================
// Group chat mein message bhejo

export async function sendGroupMessage(groupId, text, type = "text") {
  try {
    // Group messages 1-on-1 messages jaisa hi hote hain
    // Bus room ID different hota hai: "group_" + groupId
    return sendMessage(`group_${groupId}`, text, type);
  } catch (err) {
    console.error("❌ Error sending group message:", err.message);
  }
}

// USAGE:
// await sendGroupMessage("group_abc123", "Aaj kaun si chapter padhenge?");

// ============================================================================
// 🔟 SEND GROUP FILE
// ============================================================================
// Group chat mein file share karo

export async function sendGroupFile(groupId, file) {
  try {
    return sendFile(`group_${groupId}`, file);
  } catch (err) {
    console.error("❌ Error sending group file:", err.message);
  }
}

// ============================================================================
// 1️⃣1️⃣  LISTEN GROUP MESSAGES
// ============================================================================
// Group messages real-time listen karo

export function listenGroupMessages(groupId, callback) {
  try {
    return listenToMessages(`group_${groupId}`, callback);
  } catch (err) {
    console.error("❌ Error listening to group messages:", err.message);
  }
}

// ============================================================================
// 1️⃣2️⃣  GET GROUP INFO
// ============================================================================
// Group ki information fetch karo

export async function getGroupInfo(groupId) {
  try {
    const snap = await getDoc(doc(db, "groups", groupId));
    
    if (snap.exists()) {
      console.log("✅ Group info retrieved");
      return snap.data();
    } else {
      console.log("❌ Group not found");
      return null;
    }
  } catch (err) {
    console.error("❌ Error fetching group info:", err.message);
    return null;
  }
}

// ============================================================================
// 1️⃣3️⃣  LEAVE GROUP
// ============================================================================
// Group se niklo

export async function leaveGroup(groupId) {
  try {
    const uid = auth.currentUser.uid;
    const groupRef = doc(db, "groups", groupId);
    const snap = await getDoc(groupRef);
    
    if (!snap.exists()) {
      return { success: false, error: "Group not found" };
    }

    let members = snap.data().members || [];
    members = members.filter(m => m !== uid);  // Current user ko remove karo

    await updateDoc(groupRef, {
      members: members,
      memberCount: members.length
    });

    console.log("✅ Left group");
    return { success: true };

  } catch (err) {
    console.error("❌ Error leaving group:", err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 1️⃣4️⃣  GET ALL GROUPS - User Ke Sab Groups
// ============================================================================
// Logged-in user ke sab groups fetch karo

export async function getUserGroups() {
  try {
    const uid = auth.currentUser.uid;

    // Jo groups create kiye
    const createdSnap = await getDocs(
      query(
        collection(db, "groups"),
        where("createdBy", "==", uid)
      )
    );

    // Jo groups mein join kiye
    const joinedSnap = await getDocs(
      query(
        collection(db, "groups"),
        where("members", "array-contains", uid)
      )
    );

    const groups = [];
    
    createdSnap.docs.forEach(d => {
      groups.push({ id: d.id, ...d.data(), role: "creator" });
    });

    joinedSnap.docs.forEach(d => {
      const exists = groups.find(g => g.id === d.id);
      if (!exists) {
        groups.push({ id: d.id, ...d.data(), role: "member" });
      }
    });

    console.log("✅ User groups retrieved:", groups.length);
    return groups;

  } catch (err) {
    console.error("❌ Error fetching user groups:", err.message);
    return [];
  }
}

// ============================================================================
// COMPLETE USAGE EXAMPLE - CHAT PAGE
// ============================================================================

/*

// ===== 1-on-1 CHAT PAGE (chat.html) =====
import { 
  sendMessage, 
  listenToMessages, 
  getChatRoomId,
  sendFile,
  getChatHistory 
} from "./chat.js";
import { getCurrentUserProfile } from "./auth.js";

// Get other user's ID from URL params
const otherUserId = new URLSearchParams(window.location.search).get("uid");
const currentUser = await getCurrentUserProfile();
const roomId = getChatRoomId(currentUser.uid, otherUserId);

console.log("Chat room:", roomId);

// Messages container
const messagesDiv = document.getElementById("messagesContainer");

// Load chat history
const history = await getChatHistory(roomId);
displayMessages(history);

// Listen to real-time messages
listenToMessages(roomId, (messages) => {
  messagesDiv.innerHTML = ""; // Clear
  displayMessages(messages);
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto scroll
});

function displayMessages(messages) {
  messages.forEach(msg => {
    const msgEl = document.createElement("div");
    msgEl.className = msg.uid === currentUser.uid ? "sent" : "received";
    
    if (msg.type === "text") {
      msgEl.innerHTML = `
        <strong>${msg.senderName}</strong><br>
        ${msg.text}
      `;
    } else if (msg.type === "image") {
      msgEl.innerHTML = `
        <strong>${msg.senderName}</strong><br>
        <img src="${msg.text}" style="max-width:300px; border-radius:8px;">
      `;
    } else if (msg.type === "file") {
      msgEl.innerHTML = `
        <strong>${msg.senderName}</strong><br>
        <a href="${msg.text}" download>📎 Download File</a>
      `;
    }
    
    messagesDiv.appendChild(msgEl);
  });
}

// Send message button
document.getElementById("sendBtn").addEventListener("click", async () => {
  const text = document.getElementById("messageInput").value;
  if (text.trim()) {
    await sendMessage(roomId, text);
    document.getElementById("messageInput").value = "";
  }
});

// Send file button
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    await sendFile(roomId, file);
  }
});

// ===== GROUP CHAT PAGE (group-room.html) =====
import { 
  sendGroupMessage, 
  listenGroupMessages,
  getGroupInfo,
  leaveGroup 
} from "./chat.js";

const groupId = new URLSearchParams(window.location.search).get("gid");

// Get group info
const groupInfo = await getGroupInfo(groupId);
document.getElementById("groupName").textContent = groupInfo.name;
document.getElementById("memberCount").textContent = groupInfo.memberCount + " members";

// Listen to group messages
listenGroupMessages(groupId, (messages) => {
  // Display messages
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  messages.forEach(msg => {
    const el = document.createElement("div");
    el.className = "group-message";
    el.innerHTML = `
      <img src="${msg.senderPhoto}" class="avatar">
      <div>
        <strong>${msg.senderName}</strong>
        <p>${msg.text}</p>
      </div>
    `;
    container.appendChild(el);
  });
});

// Send group message
document.getElementById("sendBtn").addEventListener("click", async () => {
  const text = document.getElementById("messageInput").value;
  if (text.trim()) {
    await sendGroupMessage(groupId, text);
    document.getElementById("messageInput").value = "";
  }
});

// Leave group button
document.getElementById("leaveBtn").addEventListener("click", async () => {
  const result = await leaveGroup(groupId);
  if (result.success) {
    alert("✅ Group left!");
    window.location.href = "../dashboard/dashboard.html";
  }
});

*/
