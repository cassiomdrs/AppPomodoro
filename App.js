import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Vibration
} from 'react-native';

export default function App() {
  // 1. Estados
  const TEMPO_ESTUDO = 25 * 60; // 25 minutos em segundos
  const TEMPO_DESCANSO = 5 * 60;  // 5 minutos em segundos

  const [segundos, setSegundos] = useState(TEMPO_ESTUDO);
  const [modo, setModo] = useState('FOCO'); // 'FOCO' ou 'DESCANSO'
  const [rodando, setRodando] = useState(false); // Inicia pausado
  const [duvida, setDuvida] = useState('');
  const [duvidasSalvas, setDuvidasSalvas] = useState([
    'Qual a diferença entre UI Design, UX Design e o Design System na prática?'
  ]);
  const [mostrarLista, setMostrarLista] = useState(false);

  // 2. Alarme com Vibração
  function tocarAlarme() {
    Vibration.vibrate([0, 500, 200, 500, 200, 1000]);
  }

  // 3. Temporizador
  useEffect(() => {
    let intervalo = null;

    if (rodando && segundos > 0) {
      intervalo = setInterval(() => {
        setSegundos((seg) => seg - 1);
      }, 1000);
    } else if (segundos === 0 && rodando) {
      setRodando(false);
      tocarAlarme();

      if (modo === 'FOCO') {
        setModo('DESCANSO');
        setSegundos(TEMPO_DESCANSO);
      } else {
        setModo('FOCO');
        setSegundos(TEMPO_ESTUDO);
      }

      clearInterval(intervalo);
    }

    return () => clearInterval(intervalo);
  }, [rodando, segundos, modo]);

  // Formatação do Tempo (MM:SS)
  const minutosFormatados = String(Math.floor(segundos / 60)).padStart(2, '0');
  const segundosFormatados = String(segundos % 60).padStart(2, '0');

  // Ações dos Botões
  const alternarPausa = () => setRodando(!rodando);

  const interromper = () => {
    setRodando(false);
    setModo('FOCO');
    setSegundos(TEMPO_ESTUDO);
  };

  const salvarDuvida = () => {
    if (duvida.trim() !== '') {
      setDuvidasSalvas([...duvidasSalvas, duvida]);
      setDuvida('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1c1d22" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Topo / Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.iconText}>☰</Text>
          <Text style={styles.headerTitle}>Pomonai by Cássio</Text>
          <Text style={styles.iconText}>⋮</Text>
        </View>

        {/* Relógio Pomodoro */}
        <View style={styles.timerContainer}>
          <View style={[
            styles.timerCircle, 
            modo === 'DESCANSO' && styles.timerCircleDescanso
          ]}>
            <Text style={styles.timerText}>{minutosFormatados}:{segundosFormatados}</Text>
            <Text style={styles.timerSubtext}>{modo}</Text>
            <TouchableOpacity onPress={interromper}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card: Tire sua Dúvida */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tire sua Dúvida</Text>
          
          <View style={styles.inputBoxContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite sua dúvida aqui..."
              placeholderTextColor="#888"
              value={duvida}
              onChangeText={setDuvida}
              multiline
            />
          </View>

          <TouchableOpacity style={styles.buttonPrimary} onPress={salvarDuvida}>
            <Text style={styles.buttonPrimaryText}>📄 Salvar Dúvida</Text>
          </TouchableOpacity>
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.buttonSecondary} onPress={alternarPausa}>
            <Text style={styles.buttonSecondaryText}>
              {rodando ? 'Pausar' : (segundos === (modo === 'FOCO' ? TEMPO_ESTUDO : TEMPO_DESCANSO) ? `Iniciar ${modo}` : 'Continuar')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={interromper}>
            <Text style={styles.buttonSecondaryText}>Interromper</Text>
          </TouchableOpacity>
        </View>

        {/* Rodapé: Dúvidas Salvas */}
        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            Dúvidas Salvas: <Text style={styles.footerBold}>{duvidasSalvas.length}</Text>
          </Text>
          <TouchableOpacity onPress={() => setMostrarLista(!mostrarLista)}>
            <Text style={styles.footerLink}>
              {mostrarLista ? 'Ocultar Dúvidas' : 'Ver Minhas Dúvidas'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Dúvidas */}
        {mostrarLista && (
          <View style={styles.listaContainer}>
            {duvidasSalvas.map((item, index) => (
              <View key={index} style={styles.itemDuvida}>
                <Text style={styles.itemTexto}>{index + 1}. {item}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// 🎨 Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1d22',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  iconText: {
    color: '#ffffff',
    fontSize: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: '#ff5e36',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26272d',
  },
  timerCircleDescanso: {
    borderColor: '#4caf50',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  timerSubtext: {
    color: '#a0a0a0',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 2,
  },
  closeIcon: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#2b2c34',
    borderRadius: 16,
    padding: 16,
    marginVertical: 15,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputBoxContainer: {
    borderWidth: 1,
    borderColor: '#ff5e36',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    backgroundColor: '#222329',
    marginBottom: 12,
  },
  input: {
    color: '#ffffff',
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: '#ff5e36',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  buttonSecondary: {
    flex: 0.48,
    borderColor: '#444550',
    borderWidth: 1.5,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  footerCard: {
    backgroundColor: '#2b2c34',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    color: '#aaaaaa',
    fontSize: 14,
  },
  footerBold: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footerLink: {
    color: '#ff5e36',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  listaContainer: {
    marginTop: 10,
    backgroundColor: '#2b2c34',
    borderRadius: 12,
    padding: 12,
  },
  itemDuvida: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3b45',
  },
  itemTexto: {
    color: '#ffffff',
    fontSize: 14,
  },
});